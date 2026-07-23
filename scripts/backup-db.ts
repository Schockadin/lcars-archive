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
import { uploadDbBackupToR2 } from "./r2Client";

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

  console.log(`✓ Backup hochgeladen (${(json.length / 1024).toFixed(1)} KB)`);
}

main()
  .catch((error) => {
    console.error("✗ Backup fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
