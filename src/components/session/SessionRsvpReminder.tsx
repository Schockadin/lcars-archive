"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionRsvpReminder({
  sessionId,
  unansweredCount,
}: {
  sessionId: number;
  unansweredCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function erinnern() {
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/planned-session-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Die Erinnerungen konnten nicht gesendet werden.");
        return;
      }
      setMessage(data.message ?? "Erinnerungen wurden versendet.");
      router.refresh();
    } catch {
      setError("Die Erinnerungen konnten nicht gesendet werden.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-[5px]">
      <button
        type="button"
        className="lcars-pill-btn--outline disabled:opacity-50"
        disabled={pending}
        onClick={erinnern}
      >
        {pending
          ? "Erinnerungen werden gesendet…"
          : `Per Mail an Personen ohne Rückmeldung erinnern (${unansweredCount})`}
      </button>
      {message && (
        <p className="text-lcars-ink-dim text-[12px]" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-lcars-quinary-ink text-[12px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
