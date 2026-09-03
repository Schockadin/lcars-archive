"use client";
import { useRef, useState, type ReactNode } from "react";
import type { R2BackupObject } from "@/lib/r2Backup";
import { BUTTON_CLASSNAMES } from "@/lib/constants";
import { DownloadIcon, UploadIcon, CloudIcon } from "@/lib/icons";

// Gemeinsames Bedienfeld für die beiden Backups der Administration
// (DbBackupPanel = Kampagneninhalt, UserBackupPanel = Useraccounts). Beide
// bieten dasselbe: Export lokal oder in den R2-Bucket, Import aus einer
// lokalen Datei oder aus der Bucket-Liste, mit Bestätigung vor dem
// Einspielen. Bis auf Texte, Dateinamen, Server-Actions und die Anzeige der
// Ergebnis-Zusammenfassung waren die beiden Panels Zeile für Zeile gleich —
// jetzt steckt der Ablauf einmal hier, die beiden Panels beschreiben nur
// noch ihren Fall.
//
// Generisch über die Zusammenfassung (S): der DB-Import meldet Tabellen mit
// Zeilenzahlen, der User-Import angelegte/aktualisierte/fehlgeschlagene
// Konten — deshalb rendert sie der Aufrufer selbst (renderSummary).

export interface BackupActionResult<S> {
  error?: string;
  summary?: S;
}

export interface BackupPanelActions<S> {
  // Liefert den Backup-Inhalt als JSON-String für den lokalen Download.
  exportLocal: () => Promise<{ error?: string; json?: string }>;
  // Legt das Backup direkt im R2-Bucket ab und meldet den Objekt-Key.
  exportToR2: () => Promise<{ error?: string; key?: string }>;
  listR2: () => Promise<{ error?: string; backups?: R2BackupObject[] }>;
  importLocal: (json: string) => Promise<BackupActionResult<S>>;
  importFromR2: (key: string) => Promise<BackupActionResult<S>>;
}

export default function BackupPanel<S>({
  description,
  fileNamePrefix,
  r2KeyPrefix,
  confirmImportMessage,
  confirmLocalImport = false,
  columns = false,
  actions,
  renderSummary,
}: {
  description: ReactNode;
  // Dateiname des lokalen Downloads, das Datum hängt der Panel an.
  fileNamePrefix: string;
  // Präfix der Objekt-Keys im Bucket — nur für die Anzeige der Liste.
  r2KeyPrefix: string;
  confirmImportMessage: string;
  // Auch der Import einer LOKALEN Datei fragt vorher nach (beim vollen
  // DB-Restore, der alles ersetzt; der User-Import ist ein Upsert und fragt
  // nur beim Einspielen aus dem Bucket).
  confirmLocalImport?: boolean;
  // Export und Import nebeneinander statt untereinander.
  columns?: boolean;
  actions: BackupPanelActions<S>;
  renderSummary: (summary: S) => ReactNode;
}) {
  const [exportingLocal, setExportingLocal] = useState(false);
  const [exportingR2, setExportingR2] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<S | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [r2Backups, setR2Backups] = useState<R2BackupObject[] | null>(null);
  const [r2Listing, setR2Listing] = useState(false);
  const [r2ListError, setR2ListError] = useState<string | null>(null);
  const [selectedR2Key, setSelectedR2Key] = useState("");
  const [r2Importing, setR2Importing] = useState(false);
  const [r2SavedKey, setR2SavedKey] = useState<string | null>(null);

  function backupLabel(obj: R2BackupObject): string {
    const name = obj.key
      .replace(new RegExp(`^${r2KeyPrefix}`), "")
      .replace(/\.json$/, "");
    return `${name} (${(obj.sizeBytes / 1024).toFixed(1)} KB)`;
  }

  async function handleExportLocal() {
    setExportingLocal(true);
    setError(null);
    setR2SavedKey(null);

    const result = await actions.exportLocal();
    setExportingLocal(false);

    if (result.error || !result.json) {
      setError(result.error ?? "Export fehlgeschlagen.");
      return;
    }

    const blob = new Blob([result.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportR2() {
    setExportingR2(true);
    setError(null);
    setR2SavedKey(null);

    const result = await actions.exportToR2();
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
    if (confirmLocalImport && !window.confirm(confirmImportMessage)) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setError(null);
    setSummary(null);

    try {
      const result = await actions.importLocal(await file.text());
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

    const result = await actions.listR2();
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
    if (!window.confirm(confirmImportMessage)) return;

    setR2Importing(true);
    setError(null);
    setSummary(null);

    const result = await actions.importFromR2(selectedR2Key);
    setR2Importing(false);

    if (result.error || !result.summary) {
      setError(result.error ?? "Import fehlgeschlagen.");
    } else {
      setSummary(result.summary);
    }
  }

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-ink-dim text-[13px]">{description}</p>

      <div
        className={
          columns
            ? "grid grid-cols-1 md:grid-cols-2"
            : "flex flex-col gap-[12px]"
        }
      >
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
                <p className="text-lcars-ink-dim text-[13px]">
                  Keine Backups im Bucket gefunden.
                </p>
              ) : (
                <>
                  <select
                    value={selectedR2Key}
                    onChange={(e) => setSelectedR2Key(e.target.value)}
                    className="lcars-input rounded-full"
                  >
                    {r2Backups.map((b) => (
                      <option key={b.key} value={b.key}>
                        {backupLabel(b)}
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
      </div>

      {error && (
        <p className="text-lcars-quinary" role="alert">
          {error}
        </p>
      )}

      {summary && <p className="text-lcars-primary">{renderSummary(summary)}</p>}
    </div>
  );
}
