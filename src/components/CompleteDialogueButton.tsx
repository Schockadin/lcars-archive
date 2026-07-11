"use client";
import { useActionState } from "react";
import {
  completeDialogueAction,
  type CompleteDialogueState,
} from "@/app/actions/dialogues";
import { CheckIcon } from "@/lib/icons";

const initialState: CompleteDialogueState = {};

// Abschließen ist one-way (siehe completeDialogue in dialoguesCore.ts) —
// daher confirm() vor dem Submit, um versehentliche Klicks abzufangen.
// Icon-Button statt beschrifteter Pille, analog dem "Follow beenden"-Muster
// in FollowList.tsx (/user/follow).
export default function CompleteDialogueButton({
  entrySlug,
}: {
  entrySlug: string;
}) {
  const [state, formAction, pending] = useActionState(
    completeDialogueAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="entrySlug" value={entrySlug} />
      <button
        type="submit"
        disabled={pending}
        className="lcars-icon-btn self-start disabled:opacity-50"
        aria-label="Gespräch beenden"
        title="Gespräch beenden"
        onClick={(e) => {
          if (
            !confirm(
              "Dieses Gespräch wirklich abschließen? Das lässt sich nicht rückgängig machen.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <CheckIcon />
      </button>
      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
