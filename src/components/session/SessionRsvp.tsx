"use client";
import { useActionState } from "react";
import {
  setRsvpAction,
  type PlannedSessionState,
} from "@/app/actions/plannedSessions";
import { FormError } from "@/app/_shared/FormPrimitives";
import type { RsvpResponse } from "@/lib/plannedSessionTypes";

// Zu- und Absage an einem Termin. Zwei Knöpfe statt eines Umschalters: eine
// Absage ist eine eigene Aussage, kein „nicht zugesagt" — und wer nie
// geantwortet hat, steht auf keiner der beiden Listen.
export default function SessionRsvp({
  sessionId,
  own,
}: {
  sessionId: number;
  own: RsvpResponse | null;
}) {
  const [state, formAction, pending] = useActionState<
    PlannedSessionState,
    FormData
  >(setRsvpAction, {});

  return (
    <div className="session-rsvp">
      <form action={formAction} className="session-rsvp-buttons">
        <input type="hidden" name="id" value={sessionId} />
        <button
          type="submit"
          name="response"
          value="yes"
          className="lcars-pill-btn--outline"
          aria-pressed={own === "yes"}
          disabled={pending}
        >
          Ich bin dabei
        </button>
        <button
          type="submit"
          name="response"
          value="no"
          className="lcars-pill-btn--outline"
          aria-pressed={own === "no"}
          disabled={pending}
        >
          Ich kann nicht
        </button>
      </form>
      <p className="session-rsvp-own">
        {own === "yes"
          ? "Du hast zugesagt."
          : own === "no"
            ? "Du hast abgesagt."
            : "Du hast noch nicht geantwortet."}
      </p>
      <FormError message={state.error} />
    </div>
  );
}
