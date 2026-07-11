"use client";
import { useRef, useState } from "react";
import {
  exportUsersBackupAction,
  importUsersBackupAction,
} from "./userBackupActions";
import type { RestoreUsersSummary } from "@/lib/userBackup";

// Admin-only (siehe page.tsx) — Export/Import NUR der User-Datensätze als
// JSON-Datei, per Upsert über die E-Mail-Adresse (siehe
// restoreUsersBackup/lib/userBackup.ts) statt eines vollen Restores wie beim
// DB-Backup (DbBackupPanel.tsx, das ALLE Tabellen leert und ersetzt) — für
// den gezielten Fall "nur Useraccounts sichern/übertragen, restlichen
// Kampagneninhalt unangetastet lassen". Export läuft über einen
// client-seitig erzeugten Blob statt einer Route, Import liest die Datei per
// FileReader und schickt den rohen Text an die Server Action (siehe
// userBackupActions.ts).
export default function UserBackupPanel() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RestoreUsersSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);

    const result = await exportUsersBackupAction();
    setExporting(false);

    if (result.error || !result.json) {
      setError(result.error ?? "Export fehlgeschlagen.");
      return;
    }

    const blob = new Blob([result.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neo-archiv-user-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImporting(true);
    setError(null);
    setSummary(null);

    try {
      const text = await file.text();
      const result = await importUsersBackupAction(text);
      if (result.error || !result.summary) {
        setError(result.error ?? "Import fehlgeschlagen.");
      } else {
        setSummary(result.summary);
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Exportiert alle registrierten User (inkl. Passwort-Hash) als JSON-Datei.
        Der Import legt anhand der E-Mail-Adresse fehlende User neu an bzw.
        überschreibt bestehende vollständig mit dem Stand der Datei. Die Datei
        ist entsprechend sensibel — nur für die Administration.
      </p>

      <div className="flex flex-wrap items-center gap-[12px]">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          {exporting ? "Export läuft…" : "Backup herunterladen"}
        </button>

        <label className="lcars-pill-btn--outline self-start cursor-pointer disabled:opacity-50">
          {importing ? "Import läuft…" : "Backup importieren"}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </label>
      </div>

      {error && (
        <p className="text-lcars-red" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <p className="text-lcars-amber">
          {summary.total} User verarbeitet: {summary.created} neu angelegt,{" "}
          {summary.updated} aktualisiert, {summary.failed} fehlgeschlagen.
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
