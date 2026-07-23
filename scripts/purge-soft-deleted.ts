// scripts/purge-soft-deleted.ts
//
// Täglicher Purge-Cronjob (siehe .github/workflows/daily-db-backup.yml, im
// selben Job direkt nach dem DB-Backup) — entfernt Inhalte, die seit
// mindestens SOFT_DELETE_RETENTION_DAYS weich gelöscht sind (deleted_at
// gesetzt, siehe deleteCharacter/deleteMission/deleteMissionLogAsAdmin/
// deleteArchiveEntry/deleteDialogue), endgültig aus der DB. Läuft NACH dem
// Backup-Upload, damit ein zu purgender Inhalt notfalls noch aus dem
// frischen Backup wiederhergestellt werden könnte. `--conditions=react-server`
// aus demselben Grund wie backup-db.ts (siehe dortiger Kommentar).
import sql from "@/lib/db";
import { purgeExpiredSoftDeletedContent } from "@/lib/purgeContent";

const RETENTION_DAYS = 7;

async function main() {
  console.log(
    `🔎 Purge weich gelöschter Inhalte (älter als ${RETENTION_DAYS} Tage)...`,
  );
  const result = await purgeExpiredSoftDeletedContent(RETENTION_DAYS);
  const total =
    result.characters + result.missions + result.missionLogs + result.archiveEntries;

  if (total === 0) {
    console.log("✓ Nichts zu purgen.");
    return;
  }

  console.log(
    `🗑️  Endgültig gelöscht: ${result.characters} Charakter(e), ${result.missions} Mission(en), ` +
      `${result.missionLogs} Missionslog(s), ${result.archiveEntries} Archiv-Eintrag/Dialog(e).`,
  );
}

main()
  .catch((error) => {
    console.error("✗ Purge fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
