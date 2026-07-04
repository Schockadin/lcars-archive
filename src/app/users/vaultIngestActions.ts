"use server";
import { requireAdmin } from "@/lib/dal";
import { runVaultIngest } from "@/lib/vaultIngest";

export interface VaultIngestActionState {
  log?: string[];
  error?: string;
}

// Admin-Panel-Auslöser für den Vault-Ingest (src/lib/vaultIngest.ts) —
// importiert neue Markdown-Dateien aus dem Vault-Repo in die DB, ohne
// lokalen Checkout zu benötigen. Nur wirklich neue Slugs (kein
// überschreibender Reingest), siehe Kommentar in vaultIngest.ts.
export async function runVaultIngestAction(
  _state: VaultIngestActionState,
): Promise<VaultIngestActionState> {
  await requireAdmin();

  try {
    const { log } = await runVaultIngest();
    return { log };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Ingest fehlgeschlagen: ${err.message}`
          : "Ingest fehlgeschlagen.",
    };
  }
}
