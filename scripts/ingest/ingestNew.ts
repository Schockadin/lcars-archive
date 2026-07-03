// scripts/ingest/ingestNew.ts
//
// Separates Ingest-Skript für nur wirklich neue Dateien: verarbeitet
// ausschließlich Dateien, deren slug noch NICHT in der jeweiligen Tabelle
// existiert. Sobald ein Slug einmal importiert wurde, fasst dieses Skript
// ihn bei künftigen Läufen nie wieder an — auch nicht nach Bearbeitungen
// der Quelldatei. Bearbeitungen an bestehenden Einträgen laufen weiterhin
// ausschließlich über das normale `npm run db:ingest`
// (scripts/ingest/index.ts), das unverändert bleibt.
//
// Nützlich für große Vaults, bei denen ein vollständiger Re-Import
// unnötig lange dauert, obwohl seit dem letzten Lauf nur wenige neue
// Dateien hinzugekommen sind.
import postgres from "postgres";
import { ingestArchive } from "./archive.js";
import { ingestCharacters } from "./characters.js";
import { ingestMissionLogs } from "./missionLogs.js";
import { ingestMissions } from "./missions.js";
import { ingestTimeline } from "./timeline.js";
import { resolveWikiLinks } from "./wikilinks.js";
import { notifySubscribers } from "./notify.js";

// Nach dem Ingest die Inhalts-Caches invalidieren — identische Logik wie in
// scripts/ingest/index.ts. Erfordert SITE_URL + REVALIDATE_SECRET; fehlen
// diese, wird der Schritt übersprungen.
async function triggerRevalidation() {
  const rawUrls = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!rawUrls || !secret) {
    console.warn(
      "⚠️  SITE_URL/REVALIDATE_SECRET nicht gesetzt — Cache-Revalidation übersprungen.",
    );
    return;
  }

  const targets = rawUrls
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  for (const base of targets) {
    const url = `${base.replace(/\/$/, "")}/api/revalidate`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });
      if (!res.ok) {
        console.warn(`⚠️  Revalidation ${base} fehlgeschlagen: HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { tags?: string[] };
      console.log(`♻️  Cache revalidiert (${base}): ${data.tags?.join(", ") ?? "ok"}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️  Revalidation ${base} nicht erreichbar (Dev-Server aus?): ${msg}`,
      );
    }
  }
}

async function main() {
  const connectionString =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Weder DIRECT_DATABASE_URL noch DATABASE_URL ist gesetzt");
  }

  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    throw new Error("VAULT_PATH ist nicht gesetzt");
  }

  const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  console.log("🚀 Starte Ingestion (nur neue Dateien)...");
  console.log(`📂 Vault: ${vaultPath}`);

  try {
    await ingestCharacters(sql, vaultPath, true);

    const changedMissionSlugs = new Set<string>();
    const changedCharacterSlugs = new Set<string>();
    const newLogSlugs = new Set<string>();
    for (const slug of await ingestMissions(sql, vaultPath, true)) {
      changedMissionSlugs.add(slug);
    }
    const logResult = await ingestMissionLogs(sql, vaultPath, true);
    for (const slug of logResult.missionSlugs) changedMissionSlugs.add(slug);
    for (const slug of logResult.characterSlugs) changedCharacterSlugs.add(slug);
    for (const slug of logResult.newLogSlugs) newLogSlugs.add(slug);
    const changedArchiveSlugs = await ingestArchive(sql, vaultPath, true);
    // Läuft immer über den kompletten Datenbestand, nicht nur die gerade neu
    // importierten Dateien — funktioniert unverändert wie beim Vollimport.
    await resolveWikiLinks(sql);
    // Timeline ebenfalls immer komplett neu aufbauen — liest source_md/
    // metadata aller vier Tabellen, nicht nur der gerade importierten.
    await ingestTimeline(sql);
    console.log("\n✅ Ingestion abgeschlossen");
    await notifySubscribers(
      sql,
      changedMissionSlugs,
      changedArchiveSlugs,
      changedCharacterSlugs,
      newLogSlugs,
    );
    await triggerRevalidation();
  } catch (error) {
    console.error("\n❌ Fataler Fehler:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
