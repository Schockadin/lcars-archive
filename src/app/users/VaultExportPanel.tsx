"use client";
import { useState } from "react";
import {
  prepareVaultExportAction,
  commitVaultExportBatchAction,
} from "./vaultExportActions";

// Pro Server-Aufruf committete Dateien — klein gehalten, damit ein Batch
// immer weit unter dem Netlify-Function-Timeout bleibt (siehe Kommentar in
// src/lib/vaultExport.ts).
const BATCH_SIZE = 5;

interface ExportSummary {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

// Admin-only (siehe page.tsx) — stößt den vollständigen Vault-Backup-Export
// an (src/lib/vaultExport.ts): generiert aus dem aktuellen DB-Stand die
// Markdown-Dateien für Charaktere/Missionen/Mission-Logs/Archiv-Einträge neu
// und committet sie ins Vault-Repo, in Batches statt in einem Rutsch — dazu
// clientseitig orchestriert (kein useActionState/Formular, da mehrere
// Server-Aufrufe hintereinander nötig sind), mit Fortschrittsanzeige nach
// Dateizahl.
export default function VaultExportPanel() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setRunning(true);
    setError(null);
    setSummary(null);
    setProgress(null);

    const prepared = await prepareVaultExportAction();
    if (prepared.error || !prepared.files) {
      setError(prepared.error ?? "Vorbereitung fehlgeschlagen.");
      setRunning(false);
      return;
    }

    const files = prepared.files;
    const total = files.length;
    setProgress({ done: 0, total });

    const summaryResult: ExportSummary = {
      total,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const response = await commitVaultExportBatchAction(batch);
      if (response.error || !response.results) {
        setError(response.error ?? "Commit fehlgeschlagen.");
        setRunning(false);
        return;
      }

      for (const result of response.results) {
        if (result.error) {
          summaryResult.failed++;
          summaryResult.errors.push(`${result.path}: ${result.error}`);
        } else if (result.created) {
          summaryResult.created++;
        } else {
          summaryResult.updated++;
        }
      }

      setProgress({ done: Math.min(i + BATCH_SIZE, total), total });
    }

    setSummary(summaryResult);
    setRunning(false);
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Generiert aus dem aktuellen Datenbankstand die Markdown-Dateien für
        Charaktere, Missionen, Mission-Logs und Archiv-Einträge neu und
        committet sie ins Vault-Repo (Backup). Aus der DB gelöschte Inhalte
        werden dabei nicht automatisch aus dem Vault entfernt — ihre
        Markdown-Datei bleibt bestehen, bis sie manuell im Vault-Repo
        gelöscht wird.
      </p>

      <button
        type="button"
        onClick={handleStart}
        disabled={running}
        className="lcars-switch self-start disabled:opacity-50"
      >
        {running ? "Backup läuft" : "Backup starten"}
      </button>

      {progress && (
        <div className="flex flex-col gap-[4px]">
          <div className="h-[10px] w-full overflow-hidden rounded-full bg-[var(--lcars-surface-2)]">
            <div
              className="h-full bg-[var(--lcars-amber)] transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-lcars-text-dim text-[12px]">
            {progress.done} / {progress.total} Dateien ({percent}%)
          </p>
        </div>
      )}

      {error && (
        <p className="text-lcars-red" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <p className="text-lcars-amber">
          {summary.total} Dateien verarbeitet: {summary.created} neu
          angelegt, {summary.updated} aktualisiert, {summary.failed}{" "}
          fehlgeschlagen.
          {summary.errors.length > 0 && (
            <>
              <br />
              {summary.errors.slice(0, 5).join(" · ")}
              {summary.errors.length > 5 &&
                ` · … und ${summary.errors.length - 5} weitere`}
            </>
          )}
        </p>
      )}
    </div>
  );
}
