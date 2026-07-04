"use server";
import { requireAdmin } from "@/lib/dal";
import {
  buildVaultExportFiles,
  commitVaultExportBatch,
  type VaultExportFile,
  type VaultExportFileResult,
} from "@/lib/vaultExport";

export interface PrepareVaultExportResult {
  files?: VaultExportFile[];
  error?: string;
}

// Schritt 1: baut die Markdown-Dateien aus dem aktuellen DB-Stand (reine
// DB-Reads, kein GitHub-Zugriff — schnell) und gibt sie an den Client
// zurück, der daraus die Gesamtzahl für die Fortschrittsanzeige kennt und
// sie in kleinen Batches an commitVaultExportBatchAction zurückreicht (siehe
// VaultExportPanel.tsx). Aufgeteilt in zwei Schritte, damit ein einzelner
// Server-Aufruf nie über den ganzen Vault läuft (Netlify-Function-Timeout).
export async function prepareVaultExportAction(): Promise<PrepareVaultExportResult> {
  await requireAdmin();

  try {
    const files = await buildVaultExportFiles();
    return { files };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Vorbereitung fehlgeschlagen: ${err.message}`
          : "Vorbereitung fehlgeschlagen.",
    };
  }
}

export interface CommitVaultExportBatchResult {
  results?: VaultExportFileResult[];
  error?: string;
}

// Schritt 2: committet eine kleine Menge Dateien (siehe BATCH_SIZE in
// VaultExportPanel.tsx) ins Vault-Repo.
export async function commitVaultExportBatchAction(
  files: VaultExportFile[],
): Promise<CommitVaultExportBatchResult> {
  await requireAdmin();

  try {
    const results = await commitVaultExportBatch(files);
    return { results };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Commit fehlgeschlagen: ${err.message}`
          : "Commit fehlgeschlagen.",
    };
  }
}
