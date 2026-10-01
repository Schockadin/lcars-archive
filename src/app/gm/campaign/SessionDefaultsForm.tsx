"use client";
import { useActionState } from "react";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import { SESSION_WEEKDAYS, type SessionDefaults } from "@/lib/sessionDefaultsFormat";
import {
  saveSessionDefaultsAction,
  type SessionDefaultsState,
} from "./actions";

const initialState: SessionDefaultsState = {};

export default function SessionDefaultsForm({
  defaults,
}: {
  defaults: SessionDefaults;
}) {
  const [state, formAction, pending] = useActionState(
    saveSessionDefaultsAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[12px]">
      <p className="text-lcars-ink-dim text-[13px]">
        Diese Werte werden beim Planen einer neuen Session übernommen. Als
        Datum erscheint der nächste passende Tag in einer Kalenderwoche mit
        der gewählten Parität.
      </p>

      <div className="grid gap-x-[16px] sm:grid-cols-2">
        <FormField label="Wochentag" htmlFor="session-default-weekday">
          <select
            id="session-default-weekday"
            name="weekday"
            defaultValue={defaults.weekday}
            className="lcars-input rounded-full"
            required
          >
            {SESSION_WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Kalenderwoche" htmlFor="session-default-week-parity">
          <select
            id="session-default-week-parity"
            name="weekParity"
            defaultValue={defaults.weekParity}
            className="lcars-input rounded-full"
            required
          >
            <option value="odd">Ungerade</option>
            <option value="even">Gerade</option>
          </select>
        </FormField>

        <FormField label="Uhrzeit" htmlFor="session-default-time">
          <input
            id="session-default-time"
            name="time"
            type="time"
            step={60}
            defaultValue={defaults.time}
            className="lcars-input rounded-full"
            required
          />
        </FormField>

        <FormField label="Ort" htmlFor="session-default-location">
          <input
            id="session-default-location"
            name="location"
            type="text"
            maxLength={200}
            defaultValue={defaults.location}
            className="lcars-input rounded-full"
          />
        </FormField>
      </div>

      <FormError message={state.error} />
      {state.success && <FormSuccess>Gespeichert.</FormSuccess>}
      <SubmitButton
        pending={pending}
        pendingLabel="Speichert…"
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Voreinstellungen speichern
      </SubmitButton>
    </form>
  );
}

