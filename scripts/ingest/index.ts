import postgres from "postgres";
import { ingestArchive } from "./archive.js";
import { ingestCharacters } from "./characters.js";
import { ingestMissionLogs } from "./missionLogs.js";
import { ingestMissions } from "./missions.js";
import { ingestTimeline } from "./timeline.js";
import { resolveWikiLinks } from "./wikilinks.js";
import { notifySubscribers } from "./notify.js";

// Nach erfolgreichem Ingest die Inhalts-Caches invalidieren (Schritt 3).
// Erfordert SITE_URL + REVALIDATE_SECRET; fehlen diese, wird der Schritt
// übersprungen — der Ingest selbst gilt trotzdem als erfolgreich.
//
// SITE_URL darf eine kommaseparierte Liste sein, z.B.
//   SITE_URL = "https://neo-archiv.de, http://localhost:3000"
// So invalidiert ein lokaler Ingest sowohl Produktion als auch den laufenden
// Dev-Server (sonst bleibt dessen unstable_cache nach dem Import stale).
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

// Granular aufrufbare Schritte. "missions" umfasst Missionen + Mission-Logs.
const STEPS = ["characters", "missions", "archive"] as const;
type Step = (typeof STEPS)[number];

async function runIngest(steps: Step[]) {
  // Ingest verbindet sich direkt mit Postgres und umgeht pgBouncer: Bulk-Writes
  // und Prepared Statements sind auf einer Direktverbindung am effizientesten.
  // DIRECT_DATABASE_URL sollte auf den direkten Postgres-Endpoint zeigen (nicht
  // auf pgBouncer); fehlt sie, wird auf DATABASE_URL zurückgegriffen.
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

  console.log("🚀 Starte Ingestion...");
  console.log(`📂 Vault: ${vaultPath}`);
  console.log(`📦 Schritte: ${steps.join(", ")}`);

  try {
    if (steps.includes("characters")) await ingestCharacters(sql, vaultPath);

    const changedMissionSlugs = new Set<string>();
    const changedArchiveSlugs = new Set<string>();
    const changedCharacterSlugs = new Set<string>();
    const newLogSlugs = new Set<string>();

    if (steps.includes("missions")) {
      for (const slug of await ingestMissions(sql, vaultPath)) {
        changedMissionSlugs.add(slug);
      }
      const logResult = await ingestMissionLogs(sql, vaultPath);
      for (const slug of logResult.missionSlugs) changedMissionSlugs.add(slug);
      for (const slug of logResult.characterSlugs) changedCharacterSlugs.add(slug);
      for (const slug of logResult.newLogSlugs) newLogSlugs.add(slug);
    }
    if (steps.includes("archive")) {
      for (const slug of await ingestArchive(sql, vaultPath)) {
        changedArchiveSlugs.add(slug);
      }
    }
    // Läuft immer über den kompletten Datenbestand (nicht nur die gerade
    // importierten Dateien), damit Wiki-Links auch dann aufgelöst werden,
    // wenn ihr Ziel in einem früheren/anderen Lauf importiert wurde.
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

// CLI:
//   (ohne Argument)  → alle Schritte
//   characters       → nur Charaktere
//   missions         → Missionen + Mission-Logs
//   archive          → nur Archiv-Einträge
//   revalidate       → nur Cache invalidieren (keine DB-/Vault-Zugriffe)
async function main() {
  const arg = process.argv[2];

  if (arg === "revalidate") {
    await triggerRevalidation();
    return;
  }

  let steps: Step[];
  if (!arg) {
    steps = [...STEPS];
  } else if ((STEPS as readonly string[]).includes(arg)) {
    steps = [arg as Step];
  } else {
    console.error(
      `Unbekanntes Argument "${arg}". Erlaubt: ${STEPS.join(", ")}, revalidate (oder ohne Argument für alles).`,
    );
    process.exit(1);
  }

  await runIngest(steps);
}

main();
