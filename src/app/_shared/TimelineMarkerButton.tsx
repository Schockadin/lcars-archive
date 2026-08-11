"use client";
import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, XIcon } from "@/lib/icons";
import { insertAtCursor } from "@/lib/textareaEdit";

const inputClass = "rounded-lcars-pill lcars-input w-full";

// Vorgeschlagene Marker-Kategorien — bewusst ohne mission_start/mission_end,
// die einen automatischen (kein manueller Marker-) Anwendungsfall abdeckten.
const CATEGORY_SUGGESTIONS = ["event", "dialogue", "sonstiges"];

// Kalender-Icon für die iconOnly-Variante (Integration in MarkdownEditor.tsx'
// Formatierungs-Toolbar) — gleiches Inline-SVG-Muster wie die Icons in
// @/lib/icons (stroke="currentColor", erbt die Textfarbe des Buttons).
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
    </svg>
  );
}

// Admin/GM-Werkzeug oberhalb der Content-Textareas: fügt einen
// <!-- timeline: JJJJ-MM-TT | Titel | Kategorie --> Marker an der aktuellen
// Cursor-Position ein. Der Marker erzeugt eine unsichtbare Sprungmarke im
// gerenderten Inhalt (siehe remarkTimelineAnchors in src/lib/markdown.ts) und
// hält die Datengrundlage für eine mögliche künftige Timeline-Funktion
// vor (die frühere Timeline-Seite und ihr Ingest sind entfernt). Manipuliert
// die
// Ziel-Textarea direkt per DOM (textareaId), statt
// über einen Callback/kontrollierten State zu gehen — alle Content-
// Textareas in der App sind unkontrolliert (defaultValue), ein direkter
// Werteingriff ist hier deshalb genau das richtige Werkzeug und spart eine
// aufwändige Ref-Weiterreichung durch mehrere Formular-Ebenen.
export default function TimelineMarkerButton({
  textareaId,
  iconOnly = false,
}: {
  textareaId: string;
  // Kompakte Icon-Variante für die Integration in MarkdownEditor.tsx'
  // Toolbar (neben den übrigen Formatierungsbuttons) statt der eigenständigen
  // Textpille oberhalb der Textarea — Modal/Einfüge-Logik bleibt identisch.
  iconOnly?: boolean;
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
    insertAtCursor(textarea, marker, { ownLine: true });

    setDate("");
    setTitle("");
    setCategory("");
    setOpen(false);
  }

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="lcars-icon-btn"
          aria-label="Zeitleisten-Ereignis einfügen"
          title="Zeitleisten-Ereignis einfügen"
        >
          <CalendarIcon />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="lcars-pill-btn self-start"
          title="Zeitleisten-Ereignis einfügen"
        >
          Ereignis einfügen
        </button>
      )}

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
                <button
                  type="button"
                  onClick={close}
                  className="lcars-icon-btn lcars-icon-btn--danger size-[40px]"
                  aria-label="Abbrechen"
                  title="Abbrechen"
                >
                  <XIcon />
                </button>
                <button
                  type="submit"
                  className="lcars-icon-btn size-[40px]"
                  aria-label="Einfügen"
                  title="Einfügen"
                >
                  <CheckIcon />
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
