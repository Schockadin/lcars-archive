"use client";
import { useState } from "react";
import { regenerateAllDialogueContentAction } from "./dialogueContentActions";

// Admin-only (siehe page.tsx) — Backfill für bereits geschlossene Dialoge,
// die vor Einführung des Fließtext-Features (archive_entries.content/
// source_md aus dialogue_messages, siehe dialoguesCore.ts) abgeschlossen
// wurden. Neu abgeschlossene Dialoge brauchen das nicht — die bekommen
// ihren Fließtext automatisch. regenerateDialogueContent überschreibt nie
// einen bereits vorhandenen Fließtext, ein erneuter Klick ist also
// gefahrlos (meldet dann 0 aktualisierte Gespräche).
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
        Erzeugt für alle bereits abgeschlossenen Gespräche OHNE bestehenden
        Fließtext (Vorlesbare Zusammenfassung statt Karten-Ansicht) einen
        — nötig einmalig für Dialoge, die vor Einführung dieses Features
        abgeschlossen wurden. Bereits vorhandener Fließtext bleibt dabei
        immer unverändert.
      </p>

      <button
        type="button"
        onClick={handleStart}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? "Wird erzeugt…" : "Fehlenden Fließtext nachträglich erzeugen"}
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
