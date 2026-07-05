"use client";
import { useId, useState } from "react";
import { createPortal } from "react-dom";

const inputClass = "rounded-lcars-pill lcars-input w-full";

// Bekannte Marker-Kategorien (siehe scripts/ingest/timeline.ts) — bewusst
// ohne mission_start/mission_end, die entstehen automatisch aus
// started_at/ended_at und sind kein manueller Marker-Anwendungsfall.
const CATEGORY_SUGGESTIONS = ["event", "dialogue", "sonstiges"];

function insertAtCursor(textarea: HTMLTextAreaElement, text: string): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);

  // Marker landet auf einer eigenen Zeile, unabhängig davon, wo genau der
  // Cursor im Text steht.
  const leadingNewline =
    before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  const trailingNewline =
    after.length > 0 && !after.startsWith("\n") ? "\n" : "";
  const insert = `${leadingNewline}${text}${trailingNewline}`;

  textarea.value = before + insert + after;
  const cursorPos = (before + insert).length;
  textarea.setSelectionRange(cursorPos, cursorPos);
  textarea.focus();
}

// Admin/GM-Werkzeug oberhalb der Content-Textareas: fügt einen
// <!-- timeline: JJJJ-MM-TT | Titel | Kategorie --> Marker an der aktuellen
// Cursor-Position ein (siehe scripts/ingest/timeline.ts für das Marker-
// Format, das der nächste Vault-Export/Ingest zu einem Timeline-Ereignis
// macht). Manipuliert die Ziel-Textarea direkt per DOM (textareaId), statt
// über einen Callback/kontrollierten State zu gehen — alle Content-
// Textareas in der App sind unkontrolliert (defaultValue), ein direkter
// Werteingriff ist hier deshalb genau das richtige Werkzeug und spart eine
// aufwändige Ref-Weiterreichung durch mehrere Formular-Ebenen.
export default function TimelineMarkerButton({
  textareaId,
}: {
  textareaId: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const categoryListId = useId();

  function close() {
    setOpen(false);
  }

  function handleInsert(e: React.FormEvent) {
    e.preventDefault();
    const textarea = document.getElementById(textareaId);
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    const cat = category.trim();
    const marker = `<!-- timeline: ${date} | ${title.trim()}${cat ? ` | ${cat}` : ""} -->`;
    insertAtCursor(textarea, marker);

    setDate("");
    setTitle("");
    setCategory("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lcars-switch self-start"
      >
        Zeitleisten-Ereignis einfügen
      </button>

      {open &&
        createPortal(
          <div
            className="timeline-marker-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Zeitleisten-Ereignis einfügen"
            onClick={close}
          >
            <form
              onSubmit={handleInsert}
              className="timeline-marker-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="lcars-toc-title">Zeitleisten-Ereignis</h2>

              <label className="flex flex-col gap-[4px] text-[13px]">
                Datum
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-[4px] text-[13px]">
                Titel
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-[4px] text-[13px]">
                Kategorie (optional)
                <input
                  type="text"
                  list={categoryListId}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                />
                <datalist id={categoryListId}>
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>

              <div className="flex gap-[12px] items-center justify-end">
                <button type="button" onClick={close} className="lcars-switch">
                  Abbrechen
                </button>
                <button type="submit" className="lcars-switch">
                  Einfügen
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
