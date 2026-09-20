// scripts/backup-db.ts
//
// Täglicher DB-Backup-Cronjob (siehe .github/workflows/daily-db-backup.yml):
// nutzt exportDatabaseBackup() — dieselbe Export-Logik wie der manuelle
// "DB-Backup herunterladen"-Button im Adminpanel (DbBackupPanel.tsx) — und
// lädt das Ergebnis nach Cloudflare R2 hoch. Läuft per `tsx` außerhalb von
// Next, braucht daher `--conditions=react-server`, damit das reale
// "server-only"-Package (jetzt eine echte Dependency, siehe package.json)
// über seine "react-server"-Exportbedingung auf den No-op-Stub statt auf
// den werfenden Default-Export auflöst — exakt die Bedingung, die Next.js'
// eigener Server-Build normalerweise implizit setzt.
import sql from "@/lib/db";
import { exportDatabaseBackup } from "@/lib/dbBackup";
import { BACKUP_EXCLUDED_TABLES, BACKUP_TABLES } from "@/lib/dbTables";
import { uploadDbBackupToR2 } from "./r2Client";

// Kennt das Backup noch alle Tabellen, die es in der LAUFENDEN Datenbank
// gibt?
//
// src/lib/dbTables.test.ts prüft die Listen gegen scripts/schema.sql und
// fängt damit alles ab, was über das Repo läuft. Eine Tabelle, die jemand
// direkt an der produktiven Datenbank anlegt, sieht dieser Test nie — sie
// fiele still aus dem nächtlichen Backup. Deshalb hier derselbe Abgleich
// gegen die echte Datenbank.
//
// Gemeldet wird NACH dem Upload: Das Backup des Tages soll erst sicher
// liegen, bevor der Lauf rot wird.
async function unbekannteTabellen(): Promise<string[]> {
  const rows = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const bekannt = new Set<string>([
    ...BACKUP_TABLES,
    ...BACKUP_EXCLUDED_TABLES,
  ]);
  return rows.map((r) => r.table_name).filter((name) => !bekannt.has(name));
}

async function main() {
  console.log("🔌 Exportiere Datenbank...");
  const backup = await exportDatabaseBackup();
  const json = JSON.stringify(backup);

  // Ein Key pro Kalendertag (nicht Timestamp) — ein erneuter Lauf am selben
  // Tag überschreibt statt zu duplizieren. Aufbewahrungsfrist/Aufräumen alter
  // Backups übernimmt cleanup-db-backups.ts, im selben Cronjob direkt im
  // Anschluss an diesen Upload (siehe .github/workflows/daily-db-backup.yml).
  // Manuelle Backups aus dem Adminpanel bekommen einen davon unterscheidbaren
  // Key, siehe buildManualDbBackupKey in src/lib/r2Backup.ts.
  const date = new Date().toISOString().slice(0, 10);
  const key = `db-backups/${date}.json`;

  console.log(`☁️  Lade Backup nach R2 hoch (Key: ${key})...`);
  await uploadDbBackupToR2(key, json);

  const tabellen = Object.keys(backup.tables).length;
  console.log(
    `✓ Backup hochgeladen (${(json.length / 1024).toFixed(1)} KB, ` +
      `${tabellen} Tabellen, Format ${backup.version})`,
  );

  const unbekannt = await unbekannteTabellen();
  if (unbekannt.length > 0) {
    console.error(
      "✗ Diese Tabellen stehen in der Datenbank, aber in keiner der beiden " +
        "Listen in src/lib/dbTables.ts — sie sind NICHT im Backup:\n  " +
        unbekannt.join("\n  ") +
        "\n  Eintragen in BACKUP_TABLES (sichern) oder " +
        "BACKUP_EXCLUDED_TABLES (mit Grund auslassen).",
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("✗ Backup fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
