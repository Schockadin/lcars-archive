"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CopyIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
  TrashIcon,
  RestoreIcon,
} from "@/lib/icons";
import { useReturnFocus } from "@/hooks/useReturnFocus";
import { useToast } from "@/components/toast/ToastProvider";

export interface RowDetailField {
  label: string;
  value: string;
}

// Optionale Edit/Delete-Konfiguration für das Zeilen-Overlay (nur /admin/db).
// Bewusst entkoppelt: das Modal rendert die Edit-UI, die eigentlichen Aktionen
// (Update/Delete) reicht der Aufrufer als Handler herein — so bleibt das Modal
// generisch (AdminLogTable nutzt es ohne edit).
export interface RowEditConfig {
  pkColumn: string;
  // Bearbeitbare Spalten (= Ergebnis-Spalten). Die pkColumn wird nie geändert.
  columns: string[];
  // Rohwerte je Spalte (unformatiert) — Basis für die Edit-Eingaben.
  rawByColumn: Record<string, unknown>;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (
    updates: Record<string, string | null>,
  ) => Promise<{ error?: string }>;
  onDelete: () => Promise<{ error?: string }>;
}

// String-Form eines Rohwerts für die Edit-Eingabe: null/undefined → leer,
// Date → ISO, Objekt (jsonb) → JSON, sonst String. Beim Speichern wandelt
// Postgres den String im Assignment-Kontext in den Spaltentyp zurück.
function toEditString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Geteiltes Zeilendetails-Modal für Admin-Tabellen (DbTableRows.tsx,
// AdminLogTable.tsx) — ein Klick auf eine Zeile öffnet die vollständigen,
// ungekürzten Werte aller Spalten. Mit optionaler edit-Konfiguration bietet es
// im DB-Bereich zusätzlich rechteabhängig Bearbeiten (Inline-Update) und
// Löschen. Gleiches Overlay-Muster (createPortal, Escape schließt, Klick
// außerhalb schließt, Scroll-Sperre) wie CharacterPortrait.tsx.
export default function RowDetailModal({
  title,
  fields,
  onClose,
  edit,
}: {
  title: string;
  fields: RowDetailField[];
  onClose: () => void;
  edit?: RowEditConfig;
}) {
  const close = useCallback(() => onClose(), [onClose]);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  useReturnFocus(true);

  const editableColumns = useMemo(
    () => (edit ? edit.columns.filter((c) => c !== edit.pkColumn) : []),
    [edit],
  );
  const initialValues = useMemo(() => {
    const init: Record<string, string> = {};
    if (edit) {
      for (const c of editableColumns) init[c] = toEditString(edit.rawByColumn[c]);
    }
    return init;
  }, [edit, editableColumns]);

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [close]);

  async function handleCopy() {
    const text = fields.map((f) => `${f.label}: ${f.value}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("In die Zwischenablage kopiert.", { kind: "success" });
    } catch {
      showToast("Kopieren fehlgeschlagen.", { kind: "error" });
    }
  }

  function startEditing() {
    setValues(initialValues);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!edit) return;
    // Nur geänderte Spalten senden.
    const updates: Record<string, string> = {};
    for (const c of editableColumns) {
      if (values[c] !== initialValues[c]) updates[c] = values[c];
    }
    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }
    setPending(true);
    setError(null);
    const res = await edit.onSave(updates);
    setPending(false);
    if (res.error) {
      setError(res.error);
      showToast(res.error, { kind: "error" });
      return;
    }
    showToast("Zeile aktualisiert.", { kind: "success" });
    close();
  }

  async function handleDelete() {
    if (!edit) return;
    if (!confirm("Diese Zeile wirklich löschen? Das lässt sich nicht rückgängig machen.")) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await edit.onDelete();
    setPending(false);
    if (res.error) {
      setError(res.error);
      showToast(res.error, { kind: "error" });
      return;
    }
    showToast("Zeile gelöscht.", { kind: "success" });
    close();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={close}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[720px] flex-col gap-[16px] overflow-y-auto rounded-[8px] border border-lcars-border bg-lcars-surface p-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <h2 className="text-lcars-primary">{title}</h2>
          <div className="flex gap-[8px]">
            {edit &&
              (editing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={pending}
                    className="lcars-icon-btn disabled:opacity-50"
                    aria-label="Speichern"
                    title="Speichern"
                  >
                    <CheckIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={pending}
                    className="lcars-icon-btn disabled:opacity-50"
                    aria-label="Bearbeiten abbrechen"
                    title="Bearbeiten abbrechen"
                  >
                    <RestoreIcon />
                  </button>
                </>
              ) : (
                <>
                  {edit.canEdit && (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="lcars-icon-btn"
                      aria-label="Bearbeiten"
                      title="Bearbeiten"
                    >
                      <PencilIcon />
                    </button>
                  )}
                  {edit.canDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={pending}
                      className="lcars-icon-btn disabled:opacity-50"
                      style={{ color: "var(--lcars-quinary)" }}
                      aria-label="Löschen"
                      title="Löschen"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </>
              ))}
            <button
              type="button"
              onClick={handleCopy}
              className="lcars-icon-btn"
              aria-label={copied ? "Kopiert!" : "Gesamten Inhalt kopieren"}
              title={copied ? "Kopiert!" : "Gesamten Inhalt kopieren"}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              type="button"
              onClick={close}
              className="lcars-icon-btn"
              aria-label="Schließen"
              autoFocus
            >
              <XIcon />
            </button>
          </div>
        </div>

        <dl className="flex flex-col gap-[12px]">
          {fields.map((f) => {
            const isEditableField =
              editing && editableColumns.includes(f.label);
            return (
              <div key={f.label}>
                <dt className="lcars-eyebrow">{f.label}</dt>
                {isEditableField ? (
                  <textarea
                    value={values[f.label] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.label]: e.target.value }))
                    }
                    rows={1}
                    className="lcars-input mt-[4px] w-full rounded-[6px] text-[13px] font-mono"
                    aria-label={`${f.label} bearbeiten`}
                  />
                ) : (
                  <dd className="text-lcars-ink text-[13px] whitespace-pre-wrap break-words">
                    {f.value}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>

        {error && (
          <p className="text-lcars-quinary text-[13px]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
