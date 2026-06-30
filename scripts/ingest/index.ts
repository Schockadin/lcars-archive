import postgres from "postgres";
import { ingestArchive } from "./archive.js";
import { ingestCharacters } from "./characters.js";
import { ingestMissionLogs } from "./missionLogs.js";
import { ingestMissions } from "./missions.js";

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

async function main() {
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

  try {
    await ingestCharacters(sql, vaultPath);
    await ingestMissions(sql, vaultPath);
    await ingestMissionLogs(sql, vaultPath);
    await ingestArchive(sql, vaultPath);
    console.log("\n✅ Ingestion abgeschlossen");
    await triggerRevalidation();
  } catch (error) {
    console.error("\n❌ Fataler Fehler:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
