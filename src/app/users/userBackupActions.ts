"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import {
  getAllUsersBackup,
  restoreUsersBackup,
  type UserBackupRecord,
  type RestoreUsersSummary,
} from "@/lib/userBackup";

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

// Nimmt den rohen Datei-Inhalt statt eines FormData-Uploads entgegen — die
// Datei wird clientseitig per FileReader gelesen (siehe UserBackupPanel.tsx),
// das JSON-Parsing/Validieren bleibt serverseitig.
export async function importUsersBackupAction(
  json: string,
): Promise<ImportUsersBackupResult> {
  await requireAdmin();

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
  revalidatePath("/users");
  return { summary };
}
