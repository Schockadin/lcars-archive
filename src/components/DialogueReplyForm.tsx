"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  getDialogueReplyState,
  postDialogueMessageAction,
  type DialogueMessageState,
} from "@/app/actions/dialogues";

const initialState: DialogueMessageState = {};

// Muster wie FollowButtons.tsx: Berechtigungsstatus wird client-seitig per
// Server Action nachgeladen (useEffect), damit /archive/[slug] selbst
// session-frei und damit statisch bleiben kann. Rendert nichts, solange
// unbekannt, und dauerhaft nichts für anonyme Besucher/Nicht-Teilnehmer.
export default function DialogueReplyForm({ entrySlug }: { entrySlug: string }) {
  const [canReply, setCanReply] = useState<boolean | null>(null);
  const [state, formAction, pending] = useActionState(
    postDialogueMessageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let cancelled = false;
    getDialogueReplyState(entrySlug).then((result) => {
      if (!cancelled) setCanReply(result.canReply);
    });
    return () => {
      cancelled = true;
    };
  }, [entrySlug]);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  if (!canReply) return null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-[8px] mt-[16px] max-w-[600px]"
    >
      <input type="hidden" name="entrySlug" value={entrySlug} />

      <label htmlFor="dlg-reply-body" className="lcars-eyebrow">
        Antworten
      </label>
      <textarea
        id="dlg-reply-body"
        name="bodyMarkdown"
        required
        className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber min-h-[100px] resize-y font-mono"
      />
      <p className="text-lcars-text-dim text-[12px]">
        Unterstützt Markdown-Formatierung.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50"
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
