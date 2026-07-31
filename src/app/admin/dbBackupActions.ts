"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { revalidateAllContent } from "@/lib/revalidate";
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  InvalidBackupError,
  type RestoreDbSummary,
} from "@/lib/dbBackup";
import {
  uploadDbBackupToR2,
  buildManualDbBackupKey,
  listDbBackupsInR2,
  downloadDbBackupFromR2,
  InvalidBackupKeyError,
  type R2BackupObject,
} from "@/lib/r2Backup";

export interface ExportDbBackupResult {
  json?: string;
  error?: string;
}

export async function exportDbBackupAction(): Promise<ExportDbBackupResult> {
  await requirePermission("db_backup");

  try {
    const backup = await exportDatabaseBackup();
    return { json: JSON.stringify(backup, null, 2) };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Export fehlgeschlagen: ${err.message}`
          : "Export fehlgeschlagen.",
    };
  }
}

export interface ImportDbBackupResult {
  summary?: RestoreDbSummary;
  error?: string;
}

// Gemeinsame Parse-/Restore-/Revalidierungs-Logik für beide Import-Wege
// (lokale Datei, R2-Bucket) — der rohe JSON-Text ist bei beiden bereits im
// Speicher (lokal per FileReader gelesen, aus R2 per downloadDbBackupFromR2),
// nur die Herkunft unterscheidet sich.
async function parseAndImportDbBackup(json: string): Promise<ImportDbBackupResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      error: `Ungültige JSON-Datei: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const summary = await importDatabaseBackup(parsed);
    // Ein Restore kann buchstäblich jede Zeile in jeder Tabelle ersetzt
    // haben — beide Cache-Ebenen pauschal invalidieren statt einzelne Tags/
    // Pfade herauszupicken (gleiches Prinzip wie /api/revalidate nach dem
    // Ingest, hier zusätzlich noch der Router-Cache selbst für Seiten ohne
    // eigenen Content-Tag, z.B. das Dashboard).
    revalidateAllContent();
    revalidatePath("/", "layout");
    return { summary };
  } catch (err) {
    if (err instanceof InvalidBackupError) {
      return { error: err.message };
    }
    return {
      error:
        err instanceof Error
          ? `Import fehlgeschlagen: ${err.message}`
          : "Import fehlgeschlagen.",
    };
  }
}

// Nimmt den rohen Datei-Inhalt statt eines FormData-Uploads entgegen (gleiches
// Muster wie importUsersBackupAction) — die Datei wird clientseitig per
// FileReader gelesen (siehe DbBackupPanel.tsx), JSON-Parsing/Validieren bleibt
// serverseitig in lib/dbBackup.ts.
export async function importDbBackupAction(
  json: string,
): Promise<ImportDbBackupResult> {
  await requirePermission("db_backup");
  return parseAndImportDbBackup(json);
}

export interface ExportDbBackupToR2Result {
  key?: string;
  error?: string;
}

// "Im R2-Bucket speichern"-Knopf — nutzt dieselbe Export-Logik wie der
// lokale Download, lädt das Ergebnis aber direkt nach R2 hoch statt es als
// Datei an den Browser auszuliefern. Eigener, vom täglichen Cronjob
// unterscheidbarer Key, siehe buildManualDbBackupKey in r2Backup.ts.
export async function exportDbBackupToR2Action(): Promise<ExportDbBackupToR2Result> {
  await requirePermission("db_backup");

  try {
    const backup = await exportDatabaseBackup();
    const json = JSON.stringify(backup);
    const key = buildManualDbBackupKey();
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

export interface ListR2BackupsResult {
  backups?: R2BackupObject[];
  error?: string;
}

// Listet die im Bucket vorhandenen Backups (Cronjob + manuell) für die
// Auswahl beim "Aus R2-Bucket importieren" — reiner Lesezugriff, keine
// Schreibaktion.
export async function listR2BackupsAction(): Promise<ListR2BackupsResult> {
  await requirePermission("db_backup");

  try {
    const backups = await listDbBackupsInR2();
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

// Lädt ein per Key ausgewähltes Backup aus R2 herunter und spielt es genau
// wie beim lokalen Datei-Import ein (voller Restore, siehe
// parseAndImportDbBackup).
export async function importDbBackupFromR2Action(
  key: string,
): Promise<ImportDbBackupResult> {
  await requirePermission("db_backup");

  let json: string;
  try {
    json = await downloadDbBackupFromR2(key);
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

  return parseAndImportDbBackup(json);
}
