"use client";
import { useActionState, useEffect, useRef } from "react";
import {
  postDialogueMessageAction,
  type DialogueMessageState,
} from "@/app/actions/dialogues";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import { FormError } from "@/app/_shared/FormPrimitives";

const initialState: DialogueMessageState = {};

// Wird nur gerendert, wenn der Aufrufer (die Server-Seite) das auch will —
// /dialogues/[slug] prüft Teilnahme + offen-Status bereits serverseitig,
// kein Client-Nachladen des Berechtigungsstatus mehr nötig. canReplyNow ist
// zusätzlich für Dialoge mit mehr als zwei Teilnehmenden relevant: dort muss
// die aufrufende Person zuerst die Antwort-Reservierung halten (siehe
// DialogueLockPanel.tsx) — ohne canReplyNow bleibt das Formular ausgeblendet,
// DialogueLockPanel zeigt stattdessen den Sperr-Status/Reservieren-Button.
// Bei genau zwei Teilnehmenden ist canReplyNow immer true (kein
// Reservierungssystem nötig).
export default function DialogueReplyForm({
  entrySlug,
  canReplyNow = true,
}: {
  entrySlug: string;
  canReplyNow?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    postDialogueMessageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  if (!canReplyNow) return null;

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
        <MarkdownFormatHint />
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {pending ? "Wird gesendet…" : "Senden"}
      </button>

      <FormError message={state?.error} />
    </form>
  );
}
