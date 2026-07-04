"use server";
import { requireAdmin } from "@/lib/dal";
import { exportContentToVault, type VaultExportResult } from "@/lib/vaultExport";

export interface VaultExportActionState {
  result?: VaultExportResult;
  error?: string;
}

// Admin-Panel-Auslöser für den Vault-Backup-Export (VaultExportPanel.tsx,
// eingebunden in /users, admin-only). Teilt sich exportContentToVault() mit
// dem künftig cronjob-tauglichen Endpoint src/app/api/vault-export/route.ts
// — dieselbe Logik, nur einmal session-authentifiziert (hier) und einmal
// secret-authentifiziert (dort).
export async function runVaultExportAction(
  _state: VaultExportActionState,
): Promise<VaultExportActionState> {
  await requireAdmin();

  try {
    const result = await exportContentToVault();
    return { result };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Vault-Export fehlgeschlagen: ${err.message}`
          : "Vault-Export fehlgeschlagen.",
    };
  }
}
