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
          Dialog-Nachrichten, Timeline, dazu seit Format 2 auch AP-Konto,
          Talente, Schwerpunkte, Hausregeln, Sessions, Notizen, Fassungen,
          Bilder und Rollen) als eine JSON-Datei. User laufen
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
          {/* Eine Datei im alten Zuschnitt (Format 1) kennt die
              Kampagnentabellen nicht. Sie werden beim Restore trotzdem
              geleert, sobald sie an einem wiederhergestellten Inhalt hängen
              (TRUNCATE ... CASCADE, siehe dbBackup.ts) — das soll hier stehen
              und nicht erst auffallen, wenn das AP-Konto fehlt. */}
          {summary.missingTables.length > 0 && (
            <div className="mt-[8px] text-lcars-quinary-ink">
              Die Datei (Format {summary.version}) enthielt diese Tabellen
              nicht:{" "}
              {summary.missingTables.join(" · ")}. Wo sie an einem
              wiederhergestellten Inhalt hängen, sind sie jetzt leer.
            </div>
          )}
        </>
      )}
    />
  );
}
