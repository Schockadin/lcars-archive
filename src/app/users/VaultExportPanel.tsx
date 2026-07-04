"use client";
import { useActionState } from "react";
import {
  runVaultExportAction,
  type VaultExportActionState,
} from "./vaultExportActions";

const initialState: VaultExportActionState = {};

// Admin-only (siehe page.tsx) — stößt den vollständigen Vault-Backup-Export
// an (src/lib/vaultExport.ts): generiert aus dem aktuellen DB-Stand die
// Markdown-Dateien für Charaktere/Missionen/Mission-Logs/Archiv-Einträge neu
// und committet sie ins Vault-Repo. Kann je nach Inhaltsmenge einen Moment
// dauern (GitHub Contents API sequenziell pro Datei) — der Button bleibt bis
// dahin disabled.
export default function VaultExportPanel() {
  const [state, formAction, pending] = useActionState(
    runVaultExportAction,
    initialState,
  );

  return (
    <form action={formAction} className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Generiert aus dem aktuellen Datenbankstand die Markdown-Dateien für
        Charaktere, Missionen, Mission-Logs und Archiv-Einträge neu und
        committet sie ins Vault-Repo (Backup). Bestehende Inhalte werden
        gelöscht aus der DB nicht automatisch aus dem Vault entfernt.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50"
      >
        {pending ? "Wird exportiert…" : "Vault-Backup jetzt generieren"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      {state?.result && (
        <p className="text-lcars-amber">
          {state.result.total} Dateien verarbeitet: {state.result.created} neu
          angelegt, {state.result.updated} aktualisiert, {state.result.failed}{" "}
          fehlgeschlagen.
          {state.result.errors.length > 0 && (
            <>
              <br />
              {state.result.errors.slice(0, 5).join(" · ")}
              {state.result.errors.length > 5 &&
                ` · … und ${state.result.errors.length - 5} weitere`}
            </>
          )}
        </p>
      )}
    </form>
  );
}
