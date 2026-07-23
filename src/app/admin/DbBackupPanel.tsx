"use client";
import { useRef, useState } from "react";
import {
  exportDbBackupAction,
  exportDbBackupToR2Action,
  importDbBackupAction,
  listR2BackupsAction,
  importDbBackupFromR2Action,
} from "./dbBackupActions";
import type { RestoreDbSummary } from "@/lib/dbBackup";
import type { R2BackupObject } from "@/lib/r2Backup";
import { BUTTON_CLASSNAMES } from "@/lib/constants";
import { DownloadIcon, UploadIcon, CloudIcon } from "@/lib/icons";

const CONFIRM_IMPORT_MESSAGE =
  "Dieses Backup jetzt einspielen? Das ERSETZT den kompletten aktuellen " +
  "Datenbankinhalt (außer Useraccounts) durch den gewählten Stand. Das " +
  "lässt sich nicht rückgängig machen, außer mit einem neueren Backup.";

function formatBackupLabel(obj: R2BackupObject): string {
  const name = obj.key.replace(/^db-backups\//, "").replace(/\.json$/, "");
  const size = `${(obj.sizeBytes / 1024).toFixed(1)} KB`;
  return `${name} (${size})`;
}

// Admin-only (siehe page.tsx) — Export/Import fast des gesamten
// Datenbankinhalts als eine JSON-Datei, bewusst OHNE die users-Tabelle (die
// läuft über ihr eigenes paralleles Backup, siehe UserBackupPanel.tsx).
// Export fragt zuerst, ob das Backup lokal heruntergeladen oder direkt im
// R2-Bucket gespeichert werden soll (zwei getrennte Buttons statt eines
// Dialogs) — letzteres nutzt denselben Bucket wie der tägliche Cronjob
// (scripts/backup-db.ts), aber einen eigenen, davon unterscheidbaren Key
// (siehe buildManualDbBackupKey in src/lib/r2Backup.ts). Import bietet
// ebenso beide Wege an: lokale Datei per FileReader, oder Auswahl aus der
// im Bucket vorhandenen Backup-Liste. Anders als der User-Import (Upsert
// per E-Mail) ist der DB-Import ein voller Restore: er LEERT vorher alle
// (Nicht-User-)Tabellen — daher die zusätzliche Bestätigung bei beiden
// Import-Wegen.
export default function DbBackupPanel() {
  const [exportingLocal, setExportingLocal] = useState(false);
  const [exportingR2, setExportingR2] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RestoreDbSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [r2Backups, setR2Backups] = useState<R2BackupObject[] | null>(null);
  const [r2Listing, setR2Listing] = useState(false);
  const [r2ListError, setR2ListError] = useState<string | null>(null);
  const [selectedR2Key, setSelectedR2Key] = useState("");
  const [r2Importing, setR2Importing] = useState(false);
  const [r2SavedKey, setR2SavedKey] = useState<string | null>(null);

  async function handleExportLocal() {
    setExportingLocal(true);
    setError(null);
    setR2SavedKey(null);

    const result = await exportDbBackupAction();
    setExportingLocal(false);

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

  async function handleExportR2() {
    setExportingR2(true);
    setError(null);
    setR2SavedKey(null);

    const result = await exportDbBackupToR2Action();
    setExportingR2(false);

    if (result.error || !result.key) {
      setError(result.error ?? "R2-Export fehlgeschlagen.");
      return;
    }
    setR2SavedKey(result.key);
    // Frisch gespeichertes Backup direkt in einer ggf. schon geladenen Liste
    // sichtbar machen, ohne dass die Administration extra neu laden muss.
    if (r2Backups) await loadR2Backups();
  }

  async function handleImportLocal(file: File) {
    if (!window.confirm(CONFIRM_IMPORT_MESSAGE)) {
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

  async function loadR2Backups() {
    setR2Listing(true);
    setR2ListError(null);

    const result = await listR2BackupsAction();
    setR2Listing(false);

    if (result.error || !result.backups) {
      setR2ListError(
        result.error ?? "Backup-Liste konnte nicht geladen werden.",
      );
      return;
    }
    setR2Backups(result.backups);
    if (result.backups.length > 0) setSelectedR2Key(result.backups[0].key);
  }

  async function handleImportFromR2() {
    if (!selectedR2Key) return;
    if (!window.confirm(CONFIRM_IMPORT_MESSAGE)) return;

    setR2Importing(true);
    setError(null);
    setSummary(null);

    const result = await importDbBackupFromR2Action(selectedR2Key);
    setR2Importing(false);

    if (result.error || !result.summary) {
      setError(result.error ?? "Import fehlgeschlagen.");
    } else {
      setSummary(result.summary);
    }
  }

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Exportiert den kompletten Datenbankinhalt außer Useraccounts
        (Charaktere, Missionen, Mission-Logs, Archiv-Einträge, Follows,
        Dialog-Nachrichten, Timeline, …) als eine JSON-Datei. User laufen über
        ein eigenes, paralleles Backup (siehe „User-Backup“ oben). Der Import
        ERSETZT den gesamten aktuellen Inhalt (außer Usern) durch den Stand der
        gewählten Datei. Die Datei ist entsprechend sensibel — nur für die
        Administration.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col gap-[6px]">
          <p className="lcars-eyebrow">Export</p>
          <div className="flex flex-wrap items-center gap-[12px]">
            <button
              type="button"
              onClick={handleExportLocal}
              disabled={exportingLocal}
              className={BUTTON_CLASSNAMES}
              title="Lokal herunterladen"
            >
              <DownloadIcon />
              {exportingLocal ? "Export läuft…" : "Lokal"}
            </button>
            <button
              type="button"
              onClick={handleExportR2}
              disabled={exportingR2}
              className={BUTTON_CLASSNAMES}
              title="Im R2-Bucket speichern"
            >
              <CloudIcon />
              {exportingR2 ? "Wird hochgeladen…" : "Im R2 speichern"}
            </button>
          </div>
          {r2SavedKey && (
            <p className="text-lcars-amber text-[13px]">
              Im Bucket gespeichert als „{r2SavedKey}“.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-[6px]">
          <p className="lcars-eyebrow">Import</p>
          <div className="flex flex-wrap items-center gap-[12px]">
            <label
              className={BUTTON_CLASSNAMES}
              title="Lokale Datei einspielen"
            >
              <UploadIcon />
              {importing ? "Import läuft…" : "Datei einspielen"}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportLocal(file);
                }}
              />
            </label>

            {r2Backups === null && (
              <button
                type="button"
                onClick={loadR2Backups}
                disabled={r2Listing}
                className={BUTTON_CLASSNAMES}
                title="Aus R2-Bucket importieren"
              >
                <CloudIcon />
                {r2Listing ? "Lädt…" : "Aus R2 importieren"}
              </button>
            )}
          </div>

          {r2ListError && (
            <p className="text-lcars-red" role="alert">
              {r2ListError}
            </p>
          )}

          {r2Backups !== null && (
            <div className="flex flex-wrap items-center gap-[12px]">
              {r2Backups.length === 0 ? (
                <p className="text-lcars-text-dim text-[13px]">
                  Keine Backups im Bucket gefunden.
                </p>
              ) : (
                <>
                  <select
                    value={selectedR2Key}
                    onChange={(e) => setSelectedR2Key(e.target.value)}
                    className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
                  >
                    {r2Backups.map((b) => (
                      <option key={b.key} value={b.key}>
                        {formatBackupLabel(b)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleImportFromR2}
                    disabled={r2Importing}
                    className="lcars-pill-btn--outline self-start disabled:opacity-50"
                    title="Dieses Backup einspielen"
                  >
                    {r2Importing ? "Import läuft…" : "Einspielen"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={loadR2Backups}
                disabled={r2Listing}
                className="lcars-pill-btn--outline self-start disabled:opacity-50"
              >
                {r2Listing ? "Lädt…" : "Liste neu laden"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-lcars-red" role="alert">
            {error}
          </p>
        )}

        {summary && (
          <p className="text-lcars-amber">
            Wiederhergestellt:{" "}
            {summary.tables.map((t) => `${t.name} (${t.rows})`).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
