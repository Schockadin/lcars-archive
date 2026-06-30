import postgres from "postgres";
import { ingestArchive } from "./archive.js";
import { ingestCharacters } from "./characters.js";
import { ingestMissionLogs } from "./missionLogs.js";
import { ingestMissions } from "./missions.js";

// Nach erfolgreichem Ingest die Inhalts-Caches der deployten Seite invalidieren
// (Schritt 3). Erfordert SITE_URL + REVALIDATE_SECRET; fehlen diese, wird der
// Schritt übersprungen — der Ingest selbst gilt trotzdem als erfolgreich.
async function triggerRevalidation() {
  const siteUrl = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!siteUrl || !secret) {
    console.warn(
      "⚠️  SITE_URL/REVALIDATE_SECRET nicht gesetzt — Cache-Revalidation übersprungen.",
    );
    return;
  }

  try {
    const res = await fetch(`${siteUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      console.warn(`⚠️  Cache-Revalidation fehlgeschlagen: HTTP ${res.status}`);
      return;
    }
    const data = (await res.json()) as { tags?: string[] };
    console.log(`♻️  Cache revalidiert: ${data.tags?.join(", ") ?? "ok"}`);
  } catch (error) {
    console.warn("⚠️  Cache-Revalidation-Aufruf fehlgeschlagen:", error);
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
