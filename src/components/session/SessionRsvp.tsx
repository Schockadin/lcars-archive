"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormError } from "@/app/_shared/FormPrimitives";
import type { RsvpResponse } from "@/lib/plannedSessionTypes";

// Zu- und Absage an einem Termin. Zwei Knöpfe statt eines Umschalters: eine
// Absage ist eine eigene Aussage, kein „nicht zugesagt" — und wer nie
// geantwortet hat, steht auf keiner der beiden Listen.
//
// Geschickt wird an /api/rsvp statt an eine Server Action: die Action war die
// einzige, die vom Dashboard ("/") aus lief, und genau sie scheiterte in der
// Netlify-Umgebung mit einem 403 (siehe route.ts). Die Antwort steht sofort
// (eigener Zustand), router.refresh() holt danach die Zahlen und Namen frisch
// vom Server.
export default function SessionRsvp({
  sessionId,
  own,
}: {
  sessionId: number;
  own: RsvpResponse | null;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState<RsvpResponse | null>(own);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);

  async function antworten(response: RsvpResponse) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, response }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Die Antwort kam nicht an. Bitte noch einmal.");
        return;
      }
      setAnswer(response);
      startTransition(() => router.refresh());
    } catch {
      setError("Die Antwort kam nicht an. Bitte noch einmal.");
    } finally {
      setSending(false);
    }
  }

  const busy = sending || pending;

  return (
    <div className="session-rsvp">
      <div className="session-rsvp-buttons">
        <button
          type="button"
          className="lcars-pill-btn--outline"
          aria-pressed={answer === "yes"}
          disabled={busy}
          onClick={() => antworten("yes")}
        >
          Ich bin dabei
        </button>
        <button
          type="button"
          className="lcars-pill-btn--outline"
          aria-pressed={answer === "no"}
          disabled={busy}
          onClick={() => antworten("no")}
        >
          Ich kann nicht
        </button>
      </div>
      <p className="session-rsvp-own">
        {answer === "yes"
          ? "Du hast zugesagt."
          : answer === "no"
            ? "Du hast abgesagt."
            : "Du hast noch nicht geantwortet."}
      </p>
      <FormError message={error ?? undefined} />
    </div>
  );
}
