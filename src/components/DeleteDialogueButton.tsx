"use client";
import { useActionState } from "react";
import {
  deleteDialogueAction,
  type DeleteDialogueState,
} from "@/app/actions/dialogues";

const initialState: DeleteDialogueState = {};

// Admin-only (siehe Sichtbarkeits-Gate in den beiden aufrufenden Pages) —
// unwiderruflich, daher confirm() vor dem Submit wie bei
// CompleteDialogueButton.tsx.
export default function DeleteDialogueButton({
  entrySlug,
}: {
  entrySlug: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteDialogueAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="entrySlug" value={entrySlug} />
      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50 w-[250px]"
        onClick={(e) => {
          if (
            !confirm(
              "Dieses Gespräch wirklich endgültig löschen? Beide beteiligten Spieler werden per Mail informiert — das lässt sich nicht rückgängig machen.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "Wird gelöscht…" : "Gespräch löschen"}
      </button>
      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
