"use client";
import { useActionState, useState } from "react";
import { EVENT_CATEGORIES } from "@/lib/timelineTypes";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import {
  createManualEventAction,
  type ManualEventState,
} from "@/app/actions/timelineEvents";

// „Ereignis eintragen" über dem Zeitstrahl: ein zugeklapptes Formular für
// alles, was zur Kampagne gehört, aber in keinem Eintrag steht — der Vertrag,
// der unterzeichnet wird, die Sonnenfinsternis, der Regierungswechsel.
//
// Zugeklappt, weil die Chronologie zum Lesen da ist und das Eintragen die
// Ausnahme bleibt — dasselbe Muster wie das Aktionen-Feld der Inhaltsseiten.
export default function ManualEventForm() {
  const [state, formAction, pending] = useActionState<
    ManualEventState,
    FormData
  >(createManualEventAction, {});
  const [open, setOpen] = useState(false);

  return (
    <details
      className="timeline-newevent"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="timeline-newevent-head">Ereignis eintragen</summary>
      <form
        action={(data) => {
          formAction(data);
          // Nach dem Absenden zu: die Liste soll wieder frei liegen.
          setOpen(false);
        }}
        className="timeline-newevent-body"
      >
        <p className="text-lcars-ink-dim text-[12px] mb-[10px]">
          Für Begebenheiten ohne eigenen Eintrag. Was in einer Mission, einem
          Logbuch oder einem Datenbank-Eintrag steht, kommt von dort in die
          Chronologie — hier steht, was sonst nirgends steht.
        </p>
        <div className="timeline-newevent-row">
          <FormField
            label="Datum"
            htmlFor="manual-event-date"
            hint="Format JJJJ-MM-TT, z.B. 2401-03-05"
          >
            {/* Kein type="date": die Kampagne spielt im 25. Jahrhundert, der
                Datumswähler des Browsers rechnet in echten Jahren. */}
            <input
              id="manual-event-date"
              type="text"
              name="date"
              required
              placeholder="2401-03-05"
              pattern="\d{3,4}-\d{2}-\d{2}"
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
        <FormField label="Beschreibung (optional)" htmlFor="manual-event-detail">
          <textarea
            id="manual-event-detail"
            name="detail"
            rows={2}
            maxLength={2000}
            className="lcars-input"
          />
        </FormField>
        <SubmitButton pending={pending} pendingLabel="Wird eingetragen…">
          Eintragen
        </SubmitButton>
      </form>
      <FormError message={state.error} />
      {state.success && (
        <FormSuccess>Das Ereignis steht in der Chronologie.</FormSuccess>
      )}
    </details>
  );
}
