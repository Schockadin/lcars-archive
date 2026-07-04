"use client";
import { useActionState } from "react";
import {
  runVaultIngestAction,
  type VaultIngestActionState,
} from "./vaultIngestActions";

const initialState: VaultIngestActionState = {};

// Admin-only (siehe page.tsx) — Gegenstück zu VaultExportPanel: importiert
// neue Markdown-Dateien aus dem Vault-Repo in die DB (entspricht
// `npm run db:ingest:new`, nur direkt aus der laufenden App und ohne
// lokalen Vault-Checkout). Bestehende Inhalte werden dabei nie überschrieben
// — das schützt Bearbeitungen, die seither in der App gemacht wurden.
export default function VaultIngestPanel() {
  const [state, formAction, pending] = useActionState(
    runVaultIngestAction,
    initialState,
  );

  return (
    <form action={formAction} className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Importiert Markdown-Dateien aus dem Vault-Repo, deren Slug noch nicht
        in der Datenbank existiert. Bestehende Inhalte werden nicht
        überschrieben — Bearbeitungen in der App bleiben also unangetastet.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50"
      >
        {pending ? "Ingest läuft" : "Vault ingesten"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      {state?.log && (
        <textarea
          readOnly
          value={state.log.join("\n")}
          className="rounded-lcars-pill lcars-input min-h-[240px] resize-y font-mono text-[12px]"
        />
      )}
    </form>
  );
}
