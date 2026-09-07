"use client";
import { useActionState, useState } from "react";
import { EVENT_CATEGORIES } from "@/lib/timelineTypes";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import ModalOverlay from "@/components/ModalOverlay";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import {
  createManualEventAction,
  type ManualEventState,
} from "@/app/actions/timelineEvents";

// „Ereignis eintragen" über dem Zeitstrahl: ein Knopf, der ein Fenster mit dem
// Formular öffnet — für alles, was zur Kampagne gehört, aber in keinem Eintrag
// steht: der Vertrag, der unterzeichnet wird, die Sonnenfinsternis, der
// Regierungswechsel.
//
// Ein Fenster statt eines aufklappbaren Feldes: die Chronologie ist zum Lesen
// da, das Eintragen bleibt die Ausnahme — und im Fenster steht das Formular
// nicht zwischen Filterleiste und Zeitstrahl.
export default function ManualEventForm({
  defaultDate,
  characters,
}: {
  // Das Datum des jüngsten Ereignisses der Chronologie. Wer etwas einträgt,
  // trägt fast immer etwas ein, das kurz danach passiert ist — hier fängt man
  // also an zu tippen, statt das Jahrhundert von Hand zu suchen. Null, wenn
  // die Chronologie noch leer ist.
  defaultDate: string | null;
  // Das ganze Ensemble, ausdrücklich auch zurückgezogene Figuren und NPCs:
  // ein historisches Ereignis betrifft oft gerade die, die nicht mehr im
  // Dienst sind. Keine davon ist vorausgewählt.
  characters: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    ManualEventState,
    FormData
  >(createManualEventAction, {});
  const [open, setOpen] = useState(false);

  return (
    <div className="timeline-newevent">
      <button
        type="button"
        className="lcars-pill-btn--outline"
        onClick={() => setOpen(true)}
      >
        Ereignis eintragen
      </button>

      {open && (
        <ModalOverlay title="Ereignis eintragen" onClose={() => setOpen(false)}>
          <form
            action={(data) => {
              formAction(data);
              // Nach dem Absenden zu: die Rückmeldung steht darunter auf der
              // Seite, und die Liste soll wieder frei liegen.
              setOpen(false);
            }}
            className="flex flex-col"
          >
            <p className="text-lcars-ink-dim text-[12px] mb-[10px]">
              Für Begebenheiten ohne eigenen Eintrag. Was in einer Mission,
              einem Logbuch oder einem Datenbank-Eintrag steht, kommt von dort
              in die Chronologie — hier steht, was sonst nirgends steht.
            </p>
            <div className="timeline-newevent-row">
              <FormField
                label="Datum"
                htmlFor="manual-event-date"
                hint="Vorbelegt mit dem jüngsten Ereignis der Chronologie"
              >
                <input
                  id="manual-event-date"
                  type="date"
                  name="date"
                  required
                  defaultValue={defaultDate ?? ""}
                  className="lcars-input"
                />
              </FormField>
              <FormField label="Ereignisart" htmlFor="manual-event-category">
                <select
                  id="manual-event-category"
                  name="category"
                  defaultValue="other"
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
            <FormField label="Titel" htmlFor="manual-event-title">
              <input
                id="manual-event-title"
                type="text"
                name="title"
                required
                maxLength={200}
                className="lcars-input"
              />
            </FormField>
            <FormField
              label="Beschreibung (optional)"
              htmlFor="manual-event-detail"
            >
              {/* Markdown wie in allen anderen Textfeldern des Projekts. */}
              <MarkdownEditor
                id="manual-event-detail"
                name="detail"
                rows={4}
              />
            </FormField>
            {characters.length > 0 && (
              <fieldset className="flex flex-col gap-[6px] mb-[10px]">
                <legend className="lcars-eyebrow">
                  Beteiligte (optional)
                </legend>
                <div className="flex flex-wrap gap-[12px]">
                  {characters.map((character) => (
                    <label
                      key={character.id}
                      className="flex items-center gap-[6px]"
                    >
                      <input
                        type="checkbox"
                        name="characterIds"
                        value={character.id}
                      />
                      <span>{character.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <SubmitButton pending={pending} pendingLabel="Wird eingetragen…">
              Eintragen
            </SubmitButton>
          </form>
        </ModalOverlay>
      )}

      <FormError message={state.error} />
      {state.success && (
        <FormSuccess>Das Ereignis steht in der Chronologie.</FormSuccess>
      )}
    </div>
  );
}
