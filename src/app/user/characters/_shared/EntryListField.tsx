"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MinusCircleIcon, XIcon } from "@/lib/icons";
import { useReturnFocus } from "@/hooks/useReturnFocus";

// Listenfelder des Charakterbogens (Werte, Schwerpunkte, Angriffe, Ausrüstung,
// Karriere-Ereignisse, Hobbys, Talente) als gepflegte Liste statt als freies
// Textfeld: je Eintrag eine Zeile mit rotem Minus zum Entfernen, darunter ein
// Knopf, der ein Fenster zum Hinzufügen öffnet.
//
// Warum nicht weiter ein <textarea>? Zeilenweiser Freitext lässt sich weder
// zählen (Freikontingente der Ersterschaffung) noch einzeln entfernen, und ein
// versehentlich zerschossener Block nimmt gleich die ganze Liste mit.
// Abgesendet wird trotzdem dasselbe Format wie bisher — ein verstecktes Feld
// mit einem Eintrag je Zeile (siehe parseLines in statsAction.ts).

// Die reine Liste. Auch von der Talent-Liste genutzt, die ihr Hinzufügen über
// den Katalog löst (siehe TalentPicker).
export function EntryList({
  name,
  entries,
  onRemove,
  emptyText,
  readOnly,
}: {
  name: string;
  entries: string[];
  onRemove: (index: number) => void;
  emptyText: string;
  readOnly: boolean;
}) {
  return (
    <>
      {/* Der abgesendete Wert — die Anzeige darüber ist die Bedienoberfläche. */}
      <input type="hidden" name={name} value={entries.join("\n")} />

      {entries.length === 0 ? (
        <p className="lcars-empty-state">{emptyText}</p>
      ) : (
        <ul className="stat-entry-list">
          {entries.map((entry, index) => (
            <li key={`${entry}-${index}`} className="stat-entry">
              <span className="stat-entry-text">{entry}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="stat-entry-remove"
                  aria-label={`${entry} entfernen`}
                  title={`${entry} entfernen`}
                >
                  <MinusCircleIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// Fenster mit einem freien Eingabefeld. Gleiches Overlay-Muster wie
// TalentPicker/RowDetailModal (Portal, Escape schließt, Klick daneben
// schließt, Scroll-Sperre).
function EntryModal({
  title,
  placeholder,
  hint,
  onAdd,
  onClose,
}: {
  title: string;
  placeholder: string;
  hint?: string;
  onAdd: (entry: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  useReturnFocus(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function submit() {
    const entry = value.trim();
    if (!entry) return;
    onAdd(entry);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[520px] flex-col gap-[12px] rounded-[8px] border border-lcars-border bg-lcars-surface p-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <h2 className="text-lcars-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="lcars-icon-btn"
            aria-label="Schließen"
          >
            <XIcon />
          </button>
        </div>

        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Eintrag</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            // Enter im Fenster übernimmt — das umgebende Formular des
            // Charakterbogens darf dabei nicht abgeschickt werden.
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="lcars-input rounded-full w-full"
            autoFocus
          />
        </label>
        {hint && <p className="text-lcars-ink-dim text-[12px]">{hint}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Übernehmen
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function EntryListField({
  name,
  entries,
  setEntries,
  singular,
  placeholder,
  readOnly = false,
  readOnlyHint,
  // Freikontingent der Ersterschaffung, falls es eines gibt.
  max = null,
  // true = das Kontingent ist eine harte Grenze (Talente, Schwerpunkte kosten
  // danach AP). false = es wird nur angezeigt.
  enforceMax = false,
}: {
  name: string;
  entries: string[];
  setEntries: React.Dispatch<React.SetStateAction<string[]>>;
  // Einzahl für Knopf und Fenstertitel, z.B. „Wert".
  singular: string;
  placeholder: string;
  readOnly?: boolean;
  readOnlyHint?: string;
  max?: number | null;
  enforceMax?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const full = max !== null && entries.length >= max;
  const blocked = full && enforceMax;

  return (
    <div className="flex flex-col gap-[8px]">
      <EntryList
        name={name}
        entries={entries}
        onRemove={(index) =>
          setEntries((prev) => prev.filter((_, i) => i !== index))
        }
        emptyText="Noch keine Einträge."
        readOnly={readOnly}
      />

      {readOnly ? (
        readOnlyHint && <p className="stat-sheet-rule">{readOnlyHint}</p>
      ) : (
        <>
          {max !== null && (
            <p className="stat-sheet-rule">
              {entries.length} / {max} aus der Ersterschaffung
              {full ? (enforceMax ? " — Kontingent ausgeschöpft" : " — Kontingent erreicht") : ""}
            </p>
          )}
          <button
            type="button"
            disabled={blocked}
            onClick={() => setOpen(true)}
            className="lcars-pill-btn--outline self-start disabled:opacity-50"
          >
            {singular} hinzufügen
          </button>
        </>
      )}

      {open && (
        <EntryModal
          title={`${singular} hinzufügen`}
          placeholder={placeholder}
          onAdd={(entry) => {
            setEntries((prev) => [...prev, entry]);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
