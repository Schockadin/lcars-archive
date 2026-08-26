"use client";
import { useState } from "react";
import { useActionState } from "react";
import {
  updateNewsSettingsAction,
  type NewsSettingsState,
} from "./newsSettingsActions";
import {
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";

const initialState: NewsSettingsState = {};

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "created", label: "Neu" },
  { value: "updated", label: "Editiert" },
  { value: "deleted", label: "Gelöscht" },
];

// Welche News-Arten auf dem Dashboard erscheinen (Neu/Editiert/Gelöscht).
// Alle drei angehakt = „alles". Gleiches Re-Mount-per-key-Muster wie
// NotificationSettingsForm, damit die (unkontrollierten) Checkboxen nach dem
// Speichern den frisch bestätigten Stand zeigen.
export default function NewsSettingsForm({
  newsKinds,
}: {
  newsKinds: string[];
}) {
  const [state, formAction, pending] = useActionState(
    updateNewsSettingsAction,
    initialState,
  );

  const [saveCount, setSaveCount] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setSaveCount((c) => c + 1);
  }

  const selected = state.success ? (state.newsKinds ?? []) : newsKinds;

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <p className="text-lcars-ink-dim text-[13px]">
        Lege fest, welche Neuigkeiten in der News-Sektion auf dem Dashboard
        erscheinen. Alle drei angehakt entspricht „alles“.
      </p>

      <div className="flex flex-col gap-[6px]">
        {KIND_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center gap-[10px]">
            <input
              key={`news-${option.value}-${saveCount}`}
              id={`newsKinds-${option.value}`}
              name="newsKinds"
              type="checkbox"
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="lcars-checkbox"
            />
            <label htmlFor={`newsKinds-${option.value}`} className="lcars-eyebrow">
              {option.label}
            </label>
          </div>
        ))}
      </div>

      <FormError message={state?.error} />
      {state?.success && <FormSuccess>Gespeichert.</FormSuccess>}

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
      >
        Speichern
      </SubmitButton>
    </form>
  );
}
