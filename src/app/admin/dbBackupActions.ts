"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { revalidateAllContent } from "@/lib/revalidate";
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  InvalidBackupError,
  type RestoreDbSummary,
} from "@/lib/dbBackup";

export interface ExportDbBackupResult {
  json?: string;
  error?: string;
}

export async function exportDbBackupAction(): Promise<ExportDbBackupResult> {
  await requireAdmin();

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

// Nimmt den rohen Datei-Inhalt statt eines FormData-Uploads entgegen (gleiches
// Muster wie importUsersBackupAction) — die Datei wird clientseitig per
// FileReader gelesen (siehe DbBackupPanel.tsx), JSON-Parsing/Validieren bleibt
// serverseitig in lib/dbBackup.ts.
export async function importDbBackupAction(
  json: string,
): Promise<ImportDbBackupResult> {
  await requireAdmin();

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
