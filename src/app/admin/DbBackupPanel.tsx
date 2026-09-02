"use client";
import {
  exportDbBackupAction,
  exportDbBackupToR2Action,
  importDbBackupAction,
  listR2BackupsAction,
  importDbBackupFromR2Action,
} from "./dbBackupActions";
import type { RestoreDbSummary } from "@/lib/dbBackup";
import BackupPanel from "./BackupPanel";

const CONFIRM_IMPORT_MESSAGE =
  "Dieses Backup jetzt einspielen? Das ERSETZT den kompletten aktuellen " +
  "Datenbankinhalt (außer Useraccounts) durch den gewählten Stand. Das " +
  "lässt sich nicht rückgängig machen, außer mit einem neueren Backup.";

// Admin-only (siehe page.tsx) — Export/Import fast des gesamten
// Datenbankinhalts als eine JSON-Datei, bewusst OHNE die users-Tabelle (die
// läuft über ihr eigenes paralleles Backup, siehe UserBackupPanel.tsx).
// Export bietet zwei Wege (zwei getrennte Buttons statt eines Dialogs):
// lokaler Download oder direkt in den R2-Bucket — letzteres derselbe Bucket
// wie beim täglichen Cronjob (scripts/backup-db.ts), aber ein eigener, davon
// unterscheidbarer Key (siehe buildManualDbBackupKey in src/lib/r2Backup.ts).
// Import ebenso: lokale Datei oder Auswahl aus der Bucket-Liste. Anders als
// der User-Import (Upsert per E-Mail) ist der DB-Import ein voller Restore:
// er LEERT vorher alle (Nicht-User-)Tabellen — daher fragt hier auch der
// lokale Weg vorher nach (confirmLocalImport).
//
// Ablauf und Bedienelemente stecken in BackupPanel.tsx, das sich dieses
// Panel mit dem User-Backup teilt.
export default function DbBackupPanel() {
  return (
    <BackupPanel<RestoreDbSummary>
      description={
        <>
          Exportiert den kompletten Datenbankinhalt außer Useraccounts
          (Charaktere, Missionen, Mission-Logs, Datenbank-Einträge, Follows,
          Dialog-Nachrichten, Timeline, …) als eine JSON-Datei. User laufen
          über ein eigenes, paralleles Backup (siehe „User-Backup“ oben). Der
          Import ERSETZT den gesamten aktuellen Inhalt (außer Usern) durch den
          Stand der gewählten Datei. Die Datei ist entsprechend sensibel — nur
          für die Administration.
        </>
      }
      fileNamePrefix="neo-archiv-db-backup"
      r2KeyPrefix="db-backups/"
      confirmImportMessage={CONFIRM_IMPORT_MESSAGE}
      confirmLocalImport
      columns
      actions={{
        exportLocal: exportDbBackupAction,
        exportToR2: exportDbBackupToR2Action,
        listR2: listR2BackupsAction,
        importLocal: importDbBackupAction,
        importFromR2: importDbBackupFromR2Action,
      }}
      renderSummary={(summary) => (
        <>
          Wiederhergestellt:{" "}
          {summary.tables.map((t) => `${t.name} (${t.rows})`).join(" · ")}
        </>
      )}
    />
  );
}
