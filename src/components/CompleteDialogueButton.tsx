"use client";
import { useActionState, useRef } from "react";
import {
  completeDialogueAction,
  type CompleteDialogueState,
} from "@/app/actions/dialogues";

const initialState: CompleteDialogueState = {};

// Abschließen ist one-way (siehe completeDialogue in dialoguesCore.ts) —
// daher confirm() vor dem Submit, um versehentliche Klicks abzufangen.
export default function CompleteDialogueButton({
  entrySlug,
}: {
  entrySlug: string;
}) {
  const [state, formAction, pending] = useActionState(
    completeDialogueAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="entrySlug" value={entrySlug} />
      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50"
        onClick={(e) => {
          if (!confirm("Dieses Gespräch wirklich abschließen? Das lässt sich nicht rückgängig machen.")) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "Wird abgeschlossen…" : "Gespräch abschließen"}
      </button>
      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
