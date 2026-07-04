import "server-only";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import sql from "@/lib/db";
import { revalidateAllContent } from "@/lib/revalidate";
import { listVaultMarkdownFiles, getVaultBlobContent } from "@/lib/githubVault";
import { ingestCharacters } from "../../scripts/ingest/characters";
import { ingestMissions } from "../../scripts/ingest/missions";
import { ingestMissionLogs } from "../../scripts/ingest/missionLogs";
import { ingestArchive } from "../../scripts/ingest/archive";
import { ingestTimeline } from "../../scripts/ingest/timeline";
import { resolveWikiLinks } from "../../scripts/ingest/wikilinks";
import { notifySubscribers } from "../../scripts/ingest/notify";

// Rückrichtung zu src/lib/vaultExport.ts: statt aus der DB Markdown zu
// generieren, liest dieser Weg Markdown aus dem Vault-Repo und importiert es
// in die DB — nutzt dabei bewusst dieselben, bereits bestehenden
// scripts/ingest/*-Funktionen (kein Duplikat der komplexen
// Referenz-Auflösung in archive.ts), nur mit zwei Anpassungen gegenüber dem
// CLI-Aufruf:
//   1. Die Dateien kommen nicht aus einem lokalen VAULT_PATH-Checkout,
//      sondern werden per GitHub-API in ein Temp-Verzeichnis geschrieben
//      (Netlify Functions haben kein dauerhaftes Dateisystem, aber ein
//      beschreibbares /tmp pro Aufruf).
//   2. Es läuft immer im onlyNew-Modus (ON CONFLICT DO NOTHING, wie
//      `npm run db:ingest:new`) — nie der volle, überschreibende Reingest.
//      Die DB ist Source of Truth (siehe docs/content-creation-strategy.md);
//      ein Admin/GM-Edit in der App darf nicht durch einen älteren
//      Vault-Stand überschrieben werden. Der volle Reingest (mit
//      Kollisions-Prompt) bleibt bewusst ein lokales CLI-only-Werkzeug.
// notifySubscribers/ingestTimeline/resolveWikiLinks brauchen keinen
// Vault-Zugriff und laufen unverändert gegen die App-eigene sql-Instanz.

async function downloadVaultToTempDir(): Promise<{
  dir: string;
  fileCount: number;
}> {
  const files = await listVaultMarkdownFiles();
  const dir = mkdtempSync(join(tmpdir(), "vault-ingest-"));

  // Blob-Abrufe sind reine Lesezugriffe (anders als die sequenziellen
  // Schreibzugriffe in vaultExport.ts) — moderate Parallelität statt
  // Rate-Limit-Vorsicht, aber bewusst begrenzt statt alle auf einmal.
  const CONCURRENCY = 5;
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor++];
      const content = await getVaultBlobContent(file.sha);
      const target = join(dir, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content, "utf8");
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker),
  );

  return { dir, fileCount: files.length };
}

// console.log/warn/error der wiederverwendeten Ingest-Funktionen umleiten,
// statt sie ins (auf Netlify ohnehin nicht einsehbare) Server-Log zu
// schreiben — der Admin sieht den Verlauf direkt im Panel.
async function withCapturedConsole(
  fn: () => Promise<void>,
): Promise<string[]> {
  const lines: string[] = [];
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  const capture = (...args: unknown[]) => {
    lines.push(
      args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" "),
    );
  };
  console.log = capture;
  console.warn = capture;
  console.error = capture;
  try {
    await fn();
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }
  return lines;
}

export async function runVaultIngest(): Promise<{ log: string[] }> {
  const { dir: tmpDir, fileCount } = await downloadVaultToTempDir();

  try {
    const log = await withCapturedConsole(async () => {
      console.log(
        `🚀 Starte Ingestion (nur neue Dateien) — ${fileCount} Markdown-Dateien aus dem Vault-Repo geladen`,
      );

      await ingestCharacters(sql, tmpDir, true);

      const changedMissionSlugs = new Set<string>();
      const changedCharacterSlugs = new Set<string>();
      const newLogSlugs = new Set<string>();
      for (const slug of await ingestMissions(sql, tmpDir, true)) {
        changedMissionSlugs.add(slug);
      }
      const logResult = await ingestMissionLogs(sql, tmpDir, true);
      for (const slug of logResult.missionSlugs) changedMissionSlugs.add(slug);
      for (const slug of logResult.characterSlugs) {
        changedCharacterSlugs.add(slug);
      }
      for (const slug of logResult.newLogSlugs) newLogSlugs.add(slug);
      const changedArchiveSlugs = await ingestArchive(sql, tmpDir, true);

      // Beide laufen immer über den kompletten Datenbestand, nicht nur die
      // gerade neu importierten Dateien (siehe scripts/ingest/index.ts).
      await resolveWikiLinks(sql);
      await ingestTimeline(sql);

      console.log("\n✅ Ingestion abgeschlossen");

      await notifySubscribers(
        sql,
        changedMissionSlugs,
        changedArchiveSlugs,
        changedCharacterSlugs,
        newLogSlugs,
      );

      revalidateAllContent();
    });

    return { log };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
