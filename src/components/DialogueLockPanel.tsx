"use client";
import { useState, useTransition } from "react";
import { FormError } from "@/app/_shared/FormPrimitives";
import {
  reserveDialogueReplyAction,
  dialogueReservationNotifyAction,
} from "@/app/actions/dialogues";
import type { DialogueLockStatus } from "@/lib/dialogues";

// Nur bei mehr als zwei Teilnehmenden gerendert (siehe /dialogues/[slug]/
// page.tsx) — bei genau zwei Teilnehmenden ist das Selbstgespräch-Verbot in
// postDialogueMessage der einzige Schutzmechanismus, keine Reservierung
// nötig. Ohne aktive Sperre: Reservieren-Button. Mit aktiver Sperre einer
// fremden Person: Statusanzeige + optionaler "Informiere mich"-Button. Hält
// die reservierende Person selbst die Sperre, zeigt DialogueReplyForm
// (canReplyNow) direkt das Antwortformular — dieses Panel zeigt dann nur
// noch den Status ohne weitere Aktion.
export default function DialogueLockPanel({
  entrySlug,
  lockStatus,
  currentUserId,
  alreadyRequestedNotify,
}: {
  entrySlug: string;
  lockStatus: DialogueLockStatus | null;
  currentUserId: number;
  alreadyRequestedNotify: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [requested, setRequested] = useState(alreadyRequestedNotify);

  function handleReserve() {
    setError(undefined);
    startTransition(async () => {
      const result = await reserveDialogueReplyAction(entrySlug);
      if (result.error) setError(result.error);
    });
  }

  function handleNotifyMe() {
    startTransition(async () => {
      await dialogueReservationNotifyAction(entrySlug);
      setRequested(true);
    });
  }

  if (!lockStatus) {
    return (
      <div className="flex flex-col gap-[6px] mt-[12px]">
        <button
          type="button"
          onClick={handleReserve}
          disabled={pending}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
          title="Reserviert das Antwortrecht für 2 Stunden"
        >
          {pending ? "Wird reserviert…" : "Antwortrecht reservieren"}
        </button>
        <FormError message={error} />
      </div>
    );
  }

  const until = new Date(lockStatus.expiresAt).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (lockStatus.heldByUserId === currentUserId) {
    return (
      <p className="text-lcars-amber text-[13px] mt-[12px]">
        🔒 Du hast dir das Antwortrecht reserviert (bis {until} Uhr).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[6px] mt-[12px]">
      <p className="text-lcars-amber text-[13px]">
        🔒 {lockStatus.heldByName} antwortet gerade — gesperrt bis {until} Uhr.
      </p>
      {!requested && (
        <button
          type="button"
          onClick={handleNotifyMe}
          disabled={pending}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
          title="Informiere mich, wenn die Sperre endet"
        >
          Informiere mich
        </button>
      )}
      {requested && (
        <p className="text-lcars-text-dim text-[12px]">
          Du wirst benachrichtigt, sobald die Sperre endet.
        </p>
      )}
    </div>
  );
}
