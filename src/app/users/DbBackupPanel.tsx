"use client";
import { useRef, useState } from "react";
import { exportDbBackupAction, importDbBackupAction } from "./dbBackupActions";
import type { RestoreDbSummary } from "@/lib/dbBackup";

// Admin-only (siehe page.tsx) — Export/Import des GESAMTEN Datenbankinhalts
// (alle Tabellen, nicht nur User wie UserBackupPanel.tsx) als eine
// JSON-Datei. Ersetzt das frühere Vault-Backup: die Vault-Anbindung wurde
// entfernt, hier ist stattdessen der volle DB-Zustand direkt sicherbar.
// Export wie UserBackupPanel über einen client-seitig erzeugten Blob, Import
// liest die Datei per FileReader. Anders als der User-Import (Upsert per
// E-Mail) ist der DB-Import ein voller Restore: er LEERT vorher alle
// Tabellen — daher die zusätzliche Bestätigung.
export default function DbBackupPanel() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RestoreDbSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);

    const result = await exportDbBackupAction();
    setExporting(false);

    if (result.error || !result.json) {
      setError(result.error ?? "Export fehlgeschlagen.");
      return;
    }

    const blob = new Blob([result.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neo-archiv-db-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    if (
      !window.confirm(
        "Diese Datei jetzt einspielen? Das ERSETZT den kompletten aktuellen " +
          "Datenbankinhalt (alle Tabellen) durch den Stand aus der Datei. " +
          "Das lässt sich nicht rückgängig machen, außer mit einem neueren Backup.",
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setError(null);
    setSummary(null);

    try {
      const text = await file.text();
      const result = await importDbBackupAction(text);
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
        Exportiert den kompletten Datenbankinhalt (alle Tabellen — Charaktere,
        Missionen, Mission-Logs, Archiv-Einträge, User, Follows, Dialog-
        Nachrichten, Timeline, …) als eine JSON-Datei. Der Import ERSETZT den
        gesamten aktuellen Inhalt durch den Stand der Datei. Die Datei ist
        entsprechend sensibel — nur für die Administration.
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
          {importing ? "Import läuft…" : "Backup einspielen"}
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
          Wiederhergestellt:{" "}
          {summary.tables
            .map((t) => `${t.name} (${t.rows})`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
