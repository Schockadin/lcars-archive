"use client";
import { useActionState, useEffect, useRef } from "react";
import {
  postDialogueMessageAction,
  type DialogueMessageState,
} from "@/app/actions/dialogues";
import CompleteDialogueButton from "./CompleteDialogueButton";

const initialState: DialogueMessageState = {};

// Wird nur gerendert, wenn der Aufrufer (die Server-Seite) das auch will —
// /dialogues/[slug] prüft Teilnahme + offen-Status bereits serverseitig,
// kein Client-Nachladen des Berechtigungsstatus mehr nötig.
export default function DialogueReplyForm({
  entrySlug,
}: {
  entrySlug: string;
}) {
  const [state, formAction, pending] = useActionState(
    postDialogueMessageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-[8px] mt-[16px]"
    >
      <input type="hidden" name="entrySlug" value={entrySlug} />

      <label htmlFor="dlg-reply-body" className="lcars-eyebrow">
        Antworten
      </label>
      <textarea
        id="dlg-reply-body"
        name="bodyMarkdown"
        required
        className="rounded-lcars-pill lcars-input min-h-[150px] resize-y font-mono"
      />
      <p className="text-lcars-text text-[14px]">
        Unterstützt Markdown-Formatierung.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50 w-[250px]"
      >
        {pending ? "Wird gesendet…" : "Senden"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
