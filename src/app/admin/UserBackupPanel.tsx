"use client";
import { useRef, useState } from "react";
import {
  exportUsersBackupAction,
  importUsersBackupAction,
  exportUsersBackupToR2Action,
  listR2UserBackupsAction,
  importUsersBackupFromR2Action,
} from "./userBackupActions";
import type { RestoreUsersSummary } from "@/lib/userBackup";
import type { R2BackupObject } from "@/lib/r2Backup";
import { DownloadIcon, UploadIcon, CloudIcon } from "@/lib/icons";
import { BUTTON_CLASSNAMES } from "@/lib/constants";

const CONFIRM_IMPORT_MESSAGE =
  "Dieses User-Backup jetzt einspielen? Bestehende User (per E-Mail-Adresse " +
  "erkannt) werden vollständig mit dem Stand der Datei überschrieben, " +
  "fehlende neu angelegt. Das lässt sich nicht rückgängig machen, außer " +
  "mit einem neueren Backup.";

function formatBackupLabel(obj: R2BackupObject): string {
  const name = obj.key.replace(/^user-backups\//, "").replace(/\.json$/, "");
  const size = `${(obj.sizeBytes / 1024).toFixed(1)} KB`;
  return `${name} (${size})`;
}

// Admin-only (siehe page.tsx) — Export/Import NUR der User-Datensätze als
// JSON-Datei, per Upsert über die E-Mail-Adresse (siehe
// restoreUsersBackup/lib/userBackup.ts) statt eines vollen Restores wie beim
// DB-Backup (DbBackupPanel.tsx, das ALLE Tabellen leert und ersetzt) — für
// den gezielten Fall "nur Useraccounts sichern/übertragen, restlichen
// Kampagneninhalt unangetastet lassen". Export/Import bieten wie beim
// DB-Backup jeweils zwei Wege: lokal (Blob-Download / FileReader) oder
// direkt im R2-Bucket (eigener Präfix user-backups/, siehe
// USER_BACKUP_PREFIX in src/lib/backupRetention.ts).
export default function UserBackupPanel() {
  const [exportingLocal, setExportingLocal] = useState(false);
  const [exportingR2, setExportingR2] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RestoreUsersSummary | null>(null);
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

    const result = await exportUsersBackupAction();
    setExportingLocal(false);

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

  async function handleExportR2() {
    setExportingR2(true);
    setError(null);
    setR2SavedKey(null);

    const result = await exportUsersBackupToR2Action();
    setExportingR2(false);

    if (result.error || !result.key) {
      setError(result.error ?? "R2-Export fehlgeschlagen.");
      return;
    }
    setR2SavedKey(result.key);
    if (r2Backups) await loadR2Backups();
  }

  async function handleImportLocal(file: File) {
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

  async function loadR2Backups() {
    setR2Listing(true);
    setR2ListError(null);

    const result = await listR2UserBackupsAction();
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

    const result = await importUsersBackupFromR2Action(selectedR2Key);
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
        Exportiert alle registrierten User (inkl. Passwort-Hash) als JSON-Datei.
        Der Import legt anhand der E-Mail-Adresse fehlende User neu an bzw.
        überschreibt bestehende vollständig mit dem Stand der Datei. Die Datei
        ist entsprechend sensibel — nur für die Administration.
      </p>

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
          <p className="text-lcars-primary text-[13px]">
            Im Bucket gespeichert als „{r2SavedKey}“.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-[6px]">
        <p className="lcars-eyebrow">Import</p>
        <div className="flex flex-wrap items-center gap-[12px]">
          <label className={BUTTON_CLASSNAMES} title="Lokale Datei einspielen">
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
          <p className="text-lcars-quinary" role="alert">
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
                  className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-primary"
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
        <p className="text-lcars-quinary" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <p className="text-lcars-primary">
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
