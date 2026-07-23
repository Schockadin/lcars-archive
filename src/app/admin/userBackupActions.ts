"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import {
  getAllUsersBackup,
  restoreUsersBackup,
  type UserBackupRecord,
  type RestoreUsersSummary,
} from "@/lib/userBackup";
import { USER_BACKUP_PREFIX } from "@/lib/backupRetention";
import {
  uploadDbBackupToR2,
  buildManualUserBackupKey,
  listDbBackupsInR2,
  downloadDbBackupFromR2,
  InvalidBackupKeyError,
  type R2BackupObject,
} from "@/lib/r2Backup";

export interface ExportUsersBackupResult {
  json?: string;
  error?: string;
}

export async function exportUsersBackupAction(): Promise<ExportUsersBackupResult> {
  await requireAdmin();

  try {
    const records = await getAllUsersBackup();
    return { json: JSON.stringify(records, null, 2) };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Export fehlgeschlagen: ${err.message}`
          : "Export fehlgeschlagen.",
    };
  }
}

export interface ImportUsersBackupResult {
  summary?: RestoreUsersSummary;
  error?: string;
}

// Gemeinsame Parse-/Restore-/Revalidierungs-Logik für beide Import-Wege
// (lokale Datei, R2-Bucket) — gleiches Prinzip wie parseAndImportDbBackup in
// dbBackupActions.ts.
async function parseAndImportUsersBackup(json: string): Promise<ImportUsersBackupResult> {
  let records: UserBackupRecord[];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error("Erwartet ein Array von Usern.");
    }
    records = parsed;
  } catch (err) {
    return {
      error: `Ungültige JSON-Datei: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const summary = await restoreUsersBackup(records);
  revalidatePath("/admin");
  return { summary };
}

// Nimmt den rohen Datei-Inhalt statt eines FormData-Uploads entgegen — die
// Datei wird clientseitig per FileReader gelesen (siehe UserBackupPanel.tsx),
// das JSON-Parsing/Validieren bleibt serverseitig.
export async function importUsersBackupAction(
  json: string,
): Promise<ImportUsersBackupResult> {
  await requireAdmin();
  return parseAndImportUsersBackup(json);
}

export interface ExportUsersBackupToR2Result {
  key?: string;
  error?: string;
}

// "Im R2-Bucket speichern"-Knopf für User-Backups — nutzt denselben Bucket
// wie das DB-Backup, aber einen eigenen Präfix (USER_BACKUP_PREFIX), damit
// die beiden Backup-Arten sich im Bucket nicht vermischen.
export async function exportUsersBackupToR2Action(): Promise<ExportUsersBackupToR2Result> {
  await requireAdmin();

  try {
    const records = await getAllUsersBackup();
    const json = JSON.stringify(records);
    const key = buildManualUserBackupKey();
    await uploadDbBackupToR2(key, json);
    return { key };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `R2-Export fehlgeschlagen: ${err.message}`
          : "R2-Export fehlgeschlagen.",
    };
  }
}

export interface ListR2UserBackupsResult {
  backups?: R2BackupObject[];
  error?: string;
}

// Listet die im Bucket unter USER_BACKUP_PREFIX vorhandenen User-Backups für
// die Auswahl beim "Aus R2-Bucket importieren".
export async function listR2UserBackupsAction(): Promise<ListR2UserBackupsResult> {
  await requireAdmin();

  try {
    const backups = await listDbBackupsInR2(USER_BACKUP_PREFIX);
    return { backups };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Backup-Liste konnte nicht geladen werden: ${err.message}`
          : "Backup-Liste konnte nicht geladen werden.",
    };
  }
}

// Lädt ein per Key ausgewähltes User-Backup aus R2 herunter und spielt es
// genau wie beim lokalen Datei-Import ein.
export async function importUsersBackupFromR2Action(
  key: string,
): Promise<ImportUsersBackupResult> {
  await requireAdmin();

  let json: string;
  try {
    json = await downloadDbBackupFromR2(key, USER_BACKUP_PREFIX);
  } catch (err) {
    if (err instanceof InvalidBackupKeyError) {
      return { error: err.message };
    }
    return {
      error:
        err instanceof Error
          ? `Backup konnte nicht geladen werden: ${err.message}`
          : "Backup konnte nicht geladen werden.",
    };
  }

  return parseAndImportUsersBackup(json);
}
