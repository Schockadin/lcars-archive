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
  canReserve = true,
  alreadyRequestedNotify,
  onReserved,
}: {
  entrySlug: string;
  lockStatus: DialogueLockStatus | null;
  currentUserId: number;
  // Ob diese Person aktuell überhaupt antworten könnte (mind. ein eigener
  // Teilnehmer-Charakter ist nicht der zuletzt am Zug gewesene). Wenn nicht,
  // ist der Reservieren-Button gesperrt — reservieren, ohne antworten zu
  // können, würde nur alle anderen blockieren (Server-Guard zusätzlich in
  // reserveDialogueReplyAction).
  canReserve?: boolean;
  alreadyRequestedNotify: boolean;
  // Von DialogueLiveView.tsx übergeben (dessen Poll-Funktion) — löst nach
  // erfolgreicher Reservierung sofort einen Snapshot-Poll aus, statt bis zu
  // 8 Sekunden auf den nächsten Intervall-Tick zu warten, damit das
  // Antwortformular ohne spürbare Verzögerung erscheint.
  onReserved?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [requested, setRequested] = useState(alreadyRequestedNotify);

  function handleReserve() {
    setError(undefined);
    startTransition(async () => {
      const result = await reserveDialogueReplyAction(entrySlug);
      if (result.error) {
        setError(result.error);
        return;
      }
      onReserved?.();
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
          disabled={pending || !canReserve}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
          title={
            canReserve
              ? "Reserviert das Antwortrecht für 2 Stunden"
              : "Dein Charakter war zuletzt am Zug — du kannst gerade nicht antworten"
          }
        >
          {pending ? "Wird reserviert…" : "Antwortrecht reservieren"}
        </button>
        {!canReserve && (
          <p className="text-lcars-text-dim text-[12px]">
            Dein Charakter war zuletzt am Zug — warte, bis jemand anderes
            geantwortet hat, bevor du reservieren kannst.
          </p>
        )}
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
