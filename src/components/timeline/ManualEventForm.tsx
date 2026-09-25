"use client";
import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import { EVENT_CATEGORIES } from "@/lib/timelineTypes";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import ModalOverlay from "@/components/ModalOverlay";
import {
  createManualEventAction,
  updateManualEventAction,
  type ManualEventState,
} from "@/app/actions/timelineEvents";
import { PencilIcon, PlusIcon } from "@/lib/icons";
import type { ManualEventForEdit } from "@/lib/timelineManualEventTypes";

// Der Editor gehört nur ins geöffnete Modal, nicht in jede Chronologie- oder
// Dashboard-Ansicht, die lediglich den Ereignis-Knopf zeigt.
const MarkdownEditor = dynamic(() => import("@/app/_shared/MarkdownEditor"), {
  loading: () => (
    <div className="lcars-empty-state" role="status">
      Editor wird geladen…
    </div>
  ),
});

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
  event,
  triggerVariant = "icon",
  dateHint = "Vorbelegt mit dem jüngsten Ereignis der Chronologie",
}: {
  // Vorgabedatum des jeweiligen Einstiegs. Die Chronologie verwendet ihr
  // jüngstes Ereignis, der gemeinsame Anlege-Bereich das jüngste Logbuch.
  defaultDate: string | null;
  // Das ganze Ensemble, ausdrücklich auch zurückgezogene Figuren und NPCs:
  // ein historisches Ereignis betrifft oft gerade die, die nicht mehr im
  // Dienst sind. Keine davon ist vorausgewählt.
  characters: { id: number; name: string }[];
  // Mit Ereignis wird dasselbe Formular zum Editor. So bleiben Felder,
  // Validierung und Kategorien beim Anlegen und Bearbeiten identisch.
  event?: ManualEventForEdit;
  // In der Chronologie und in Inhaltszeilen bleibt der kompakte Symbolknopf.
  // Der gemeinsame „Neue Inhalte"-Abschnitt verwendet dieselbe Form dagegen
  // als beschriftete Pille neben den übrigen Anlege-Knöpfen.
  triggerVariant?: "icon" | "pill";
  dateHint?: string;
}) {
  const editing = event !== undefined;
  const [state, formAction, pending] = useActionState<
    ManualEventState,
    FormData
  >(editing ? updateManualEventAction : createManualEventAction, {});
  const [open, setOpen] = useState(false);
  const idPrefix = editing ? `manual-event-${event.id}` : "manual-event-new";
  const triggerLabel =
    triggerVariant === "pill"
      ? "Neues Event"
      : editing
        ? "Event bearbeiten"
        : "Event hinzufügen";

  return (
    <div className="timeline-newevent">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerVariant === "pill"
            ? "lcars-pill-btn w-full"
            : "lcars-icon-btn self-start"
        }
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        {triggerVariant === "pill" ? (
          "Neues Event"
        ) : editing ? (
          <PencilIcon />
        ) : (
          <PlusIcon />
        )}
      </button>

      {open && (
        <ModalOverlay
          title={editing ? "Ereignis bearbeiten" : "Ereignis eintragen"}
          onClose={() => setOpen(false)}
        >
          <form
            action={(data) => {
              formAction(data);
              // Nach dem Absenden zu: die Rückmeldung steht darunter auf der
              // Seite, und die Liste soll wieder frei liegen.
              setOpen(false);
            }}
            className="flex flex-col"
          >
            {event && <input type="hidden" name="id" value={event.id} />}
            <p className="text-lcars-ink-dim text-[12px] mb-[10px]">
              Für Begebenheiten ohne eigenen Eintrag. Was in einer Mission,
              einem Logbuch oder einem Datenbank-Eintrag steht, kommt von dort
              in die Chronologie — hier steht, was sonst nirgends steht.
            </p>
            <div className="timeline-newevent-row">
              <FormField
                label="Datum"
                htmlFor={`${idPrefix}-date`}
                hint={dateHint}
              >
                <input
                  id={`${idPrefix}-date`}
                  type="date"
                  name="date"
                  required
                  defaultValue={event?.date ?? defaultDate ?? ""}
                  className="lcars-input"
                />
              </FormField>
              <FormField label="Ereignisart" htmlFor={`${idPrefix}-category`}>
                <select
                  id={`${idPrefix}-category`}
                  name="category"
                  defaultValue={event?.category ?? "other"}
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
            <FormField label="Titel" htmlFor={`${idPrefix}-title`}>
              <input
                id={`${idPrefix}-title`}
                type="text"
                name="title"
                required
                maxLength={200}
                defaultValue={event?.title ?? ""}
                className="lcars-input"
              />
            </FormField>
            <FormField label="Teaser (optional)" htmlFor={`${idPrefix}-teaser`}>
              <textarea
                id={`${idPrefix}-teaser`}
                name="teaser"
                maxLength={500}
                rows={2}
                defaultValue={event?.teaser ?? ""}
                className="lcars-input resize-y"
              />
            </FormField>
            <FormField
              label="Volltext (optional)"
              htmlFor={`${idPrefix}-detail`}
            >
              {/* Markdown wie in allen anderen Textfeldern des Projekts. */}
              <MarkdownEditor
                id={`${idPrefix}-detail`}
                name="detail"
                rows={4}
                defaultValue={event?.detail ?? ""}
              />
            </FormField>
            {characters.length > 0 && (
              <fieldset className="flex flex-col gap-[6px] mb-[10px]">
                <legend className="lcars-eyebrow">Beteiligte (optional)</legend>
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
                        defaultChecked={event?.characterIds.includes(
                          character.id,
                        )}
                      />
                      <span>{character.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <SubmitButton
              pending={pending}
              pendingLabel={editing ? "Wird gespeichert…" : "Wird eingetragen…"}
            >
              {editing ? "Speichern" : "Eintragen"}
            </SubmitButton>
          </form>
        </ModalOverlay>
      )}

      <FormError message={state.error} />
      {state.success && (
        <FormSuccess>
          {editing
            ? "Das Ereignis wurde gespeichert."
            : "Das Ereignis steht in der Chronologie."}
        </FormSuccess>
      )}
    </div>
  );
}
