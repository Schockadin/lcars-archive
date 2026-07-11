"use client";
import { useActionState } from "react";
import {
  deleteDialogueAction,
  type DeleteDialogueState,
} from "@/app/actions/dialogues";
import { TrashIcon } from "@/lib/icons";

const initialState: DeleteDialogueState = {};

// Admin-only (siehe Sichtbarkeits-Gate in den beiden aufrufenden Pages) —
// unwiderruflich, daher confirm() vor dem Submit wie bei
// CompleteDialogueButton.tsx. Icon-Button statt beschrifteter Pille, analog
// dem "Follow beenden"-Muster in FollowList.tsx (/user/follow).
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
        className="lcars-icon-btn lcars-icon-btn--danger self-start disabled:opacity-50"
        aria-label="Gespräch löschen"
        title="Gespräch löschen"
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
        <TrashIcon />
      </button>
      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
