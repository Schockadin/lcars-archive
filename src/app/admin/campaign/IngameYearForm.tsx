"use client";
import { useActionState } from "react";
import { setIngameYearAction, type IngameYearState } from "./actions";
import {
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";

// Einstellung des aktuellen Ingame-Jahres der Kampagne (siehe
// src/lib/campaign.ts) — daraus wird zusammen mit dem Geburtsdatum eines
// Charakters dessen angezeigtes Alter abgeleitet. Leeres Feld = kein Jahr
// gesetzt (das Alter fällt dann auf den manuellen Wert zurück).
export default function IngameYearForm({
  currentYear,
}: {
  currentYear: number | null;
}) {
  const initialState: IngameYearState = {};
  const [state, formAction, pending] = useActionState(
    setIngameYearAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[12px] max-w-[320px]">
      <label htmlFor="ingameYear" className="lcars-eyebrow">
        Aktuelles Ingame-Jahr
      </label>
      <input
        id="ingameYear"
        name="ingameYear"
        type="number"
        min={0}
        defaultValue={currentYear ?? ""}
        placeholder="z.B. 2402"
        className="rounded-lcars-pill lcars-input w-full"
      />
      <p className="text-lcars-text-dim text-[13px]">
        Das angezeigte Alter eines Charakters ergibt sich aus diesem Jahr minus
        seinem Geburtsjahr. Leer lassen, um kein Jahr zu setzen.
      </p>

      <FormError message={state?.error} />
      {state?.success && (
        <FormSuccess>
          {state.year == null
            ? "Ingame-Jahr entfernt."
            : `Ingame-Jahr auf ${state.year} gesetzt.`}
        </FormSuccess>
      )}

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Speichern
      </SubmitButton>
    </form>
  );
}
