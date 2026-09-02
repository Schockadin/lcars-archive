"use client";
import {
  exportUsersBackupAction,
  importUsersBackupAction,
  exportUsersBackupToR2Action,
  listR2UserBackupsAction,
  importUsersBackupFromR2Action,
} from "./userBackupActions";
import type { RestoreUsersSummary } from "@/lib/userBackup";
import BackupPanel from "./BackupPanel";

const CONFIRM_IMPORT_MESSAGE =
  "Dieses User-Backup jetzt einspielen? Bestehende User (per E-Mail-Adresse " +
  "erkannt) werden vollständig mit dem Stand der Datei überschrieben, " +
  "fehlende neu angelegt. Das lässt sich nicht rückgängig machen, außer " +
  "mit einem neueren Backup.";

// Admin-only (siehe page.tsx) — Export/Import NUR der User-Datensätze als
// JSON-Datei, per Upsert über die E-Mail-Adresse (siehe
// restoreUsersBackup/lib/userBackup.ts) statt eines vollen Restores wie beim
// DB-Backup (DbBackupPanel.tsx, das ALLE Tabellen leert und ersetzt) — für
// den gezielten Fall "nur Useraccounts sichern/übertragen, restlichen
// Kampagneninhalt unangetastet lassen". Eigener Bucket-Präfix user-backups/
// (siehe USER_BACKUP_PREFIX in src/lib/backupRetention.ts).
//
// Ablauf und Bedienelemente stecken in BackupPanel.tsx, das sich dieses
// Panel mit dem DB-Backup teilt.
export default function UserBackupPanel() {
  return (
    <BackupPanel<RestoreUsersSummary>
      description={
        <>
          Exportiert alle registrierten User (inkl. Passwort-Hash) als
          JSON-Datei. Der Import legt anhand der E-Mail-Adresse fehlende User
          neu an bzw. überschreibt bestehende vollständig mit dem Stand der
          Datei. Die Datei ist entsprechend sensibel — nur für die
          Administration.
        </>
      }
      fileNamePrefix="neo-archiv-user-backup"
      r2KeyPrefix="user-backups/"
      confirmImportMessage={CONFIRM_IMPORT_MESSAGE}
      actions={{
        exportLocal: exportUsersBackupAction,
        exportToR2: exportUsersBackupToR2Action,
        listR2: listR2UserBackupsAction,
        importLocal: importUsersBackupAction,
        importFromR2: importUsersBackupFromR2Action,
      }}
      renderSummary={(summary) => (
        <>
          {summary.total} User verarbeitet: {summary.created} neu angelegt,{" "}
          {summary.updated} aktualisiert, {summary.failed} fehlgeschlagen.
          {summary.errors.length > 0 && (
            <>
              <br />
              {summary.errors.slice(0, 5).join(" · ")}
              {summary.errors.length > 5 &&
                ` · … und ${summary.errors.length - 5} weitere`}
            </>
          )}
        </>
      )}
    />
  );
}
