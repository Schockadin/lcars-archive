"use client";
import { useState } from "react";
import { regenerateAllDialogueContentAction } from "./dialogueContentActions";

// Admin-only (siehe page.tsx) — Backfill für bereits geschlossene Dialoge,
// die vor Einführung des Fließtext-Features (archive_entries.content/
// source_md aus dialogue_messages, siehe dialoguesCore.ts) abgeschlossen
// wurden. Neu abgeschlossene bzw. von einem Admin bearbeitete geschlossene
// Dialoge brauchen das nicht — die bekommen ihren Fließtext automatisch.
export default function DialogueContentRegeneratePanel() {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setRunning(true);
    setError(null);
    setCount(null);

    const result = await regenerateAllDialogueContentAction();
    setRunning(false);

    if (result.error || result.count == null) {
      setError(result.error ?? "Regenerierung fehlgeschlagen.");
      return;
    }

    setCount(result.count);
  }

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Erzeugt für alle bereits abgeschlossenen Gespräche den Fließtext
        (Vorlesbare Zusammenfassung statt Karten-Ansicht) neu — nötig einmalig
        für Dialoge, die vor Einführung dieses Features abgeschlossen wurden.
      </p>

      <button
        type="button"
        onClick={handleStart}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? "Wird erzeugt…" : "Fließtext für alle Gespräche neu erzeugen"}
      </button>

      {error && (
        <p className="text-lcars-red" role="alert">
          {error}
        </p>
      )}

      {count !== null && (
        <p className="text-lcars-amber">{count} Gespräche aktualisiert.</p>
      )}
    </div>
  );
}
