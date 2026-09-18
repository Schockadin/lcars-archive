"use client";
import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";
import { FormField } from "@/app/_shared/FormPrimitives";
import { EVENT_CATEGORIES } from "@/lib/timelineTypes";
import { insertAtCursor } from "@/lib/textareaEdit";

// Kalender-Icon für den Werkzeugleisten-Knopf — gleiches Inline-SVG-Muster
// wie die Icons in @/lib/icons (stroke="currentColor", erbt die Textfarbe des
// Buttons). Steht hier statt in icons.tsx, weil es nur dieser eine Knopf
// braucht.
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

// Der Kalender-Knopf in der Werkzeugleiste der Content-Textfelder (Charakter,
// Mission, Logbuch, Datenbank-Eintrag): Er öffnet ein Fenster mit Datum,
// Ereignisart und Titel und setzt daraus an der Cursor-Stelle einen
// <!-- timeline: JJJJ-MM-TT | Titel | Kategorie --> Marker. Der Marker ist im
// gerenderten Text unsichtbar, erzeugt dort aber eine Sprungmarke (siehe
// remarkTimelineAnchors in src/lib/markdown.ts) und bringt das Ereignis in die
// Chronologie (Herkunft „marker", siehe src/lib/timeline.ts).
//
// Die Ereignisart ist ein Auswahlfeld über EVENT_CATEGORIES — dieselbe Quelle,
// aus der die Chronologie ihre Farben, Beschriftungen und Filter zieht
// (src/lib/timelineTypes.ts) und die auch „Ereignis eintragen" anbietet
// (ManualEventForm.tsx). Vorher stand hier ein Freitextfeld mit drei
// Vorschlägen, von denen zwei gar keine Kategorie der Chronologie waren —
// getippte Werte landeten als unbekannte Art bei „Sonstiges".
//
// Manipuliert die Ziel-Textarea direkt per DOM (textareaId), statt über einen
// Callback/kontrollierten State zu gehen — alle Content-Textareas in der App
// sind unkontrolliert (defaultValue), ein direkter Werteingriff ist hier
// deshalb genau das richtige Werkzeug und spart eine aufwändige
// Ref-Weiterreichung durch mehrere Formular-Ebenen.
export default function TimelineMarkerButton({
  textareaId,
}: {
  textareaId: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("other");

  function handleInsert(e: React.FormEvent) {
    // Das Formular liegt per Portal an <body>, im React-Baum aber weiterhin
    // unter dem Formular des Editors — ohne stopPropagation sähe dessen
    // Server-Action das Submit-Ereignis mit.
    e.preventDefault();
    e.stopPropagation();
    const textarea = document.getElementById(textareaId);
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    const marker = `<!-- timeline: ${date} | ${title.trim()} | ${category} -->`;
    insertAtCursor(textarea, marker, { ownLine: true });

    setDate("");
    setTitle("");
    setCategory("other");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lcars-icon-btn"
        aria-label="Zeitleisten-Ereignis einfügen"
        title="Zeitleisten-Ereignis einfügen"
      >
        <CalendarIcon />
      </button>

      {open && (
        <ModalOverlay
          title="Zeitleisten-Ereignis"
          onClose={() => setOpen(false)}
          width={460}
        >
          <form onSubmit={handleInsert} className="flex flex-col">
            <p className="text-lcars-ink-dim text-[12px] mb-[10px]">
              Setzt an der Cursor-Stelle eine Marke. Sie bleibt im Text
              unsichtbar und bringt das Ereignis in die Chronologie — die Karte
              dort führt genau hierher zurück.
            </p>

            <div className="timeline-newevent-row">
              <FormField label="Datum" htmlFor={`${textareaId}-marker-date`}>
                <input
                  id={`${textareaId}-marker-date`}
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="lcars-input"
                />
              </FormField>
              <FormField
                label="Ereignisart"
                htmlFor={`${textareaId}-marker-category`}
              >
                <select
                  id={`${textareaId}-marker-category`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="lcars-input"
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Titel" htmlFor={`${textareaId}-marker-title`}>
              <input
                id={`${textareaId}-marker-title`}
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="lcars-input"
              />
            </FormField>

            <button
              type="submit"
              className="lcars-pill-btn--outline self-start"
            >
              Einfügen
            </button>
          </form>
        </ModalOverlay>
      )}
    </>
  );
}
