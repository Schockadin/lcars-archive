"use client";
import { useState } from "react";
import { regenerateTimelineAction } from "./timelineActions";

// Admin-only (siehe page.tsx) — baut timeline_events komplett aus dem
// aktuellen DB-Stand neu auf (siehe regenerateTimeline in src/lib/timeline.ts),
// z.B. nachdem Marker im Vault-Ingest hinzugekommen sind oder Ereignisse
// manuell inkonsistent geworden sind.
export default function TimelineRegeneratePanel() {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setRunning(true);
    setError(null);
    setCount(null);
    setWarnings([]);

    const result = await regenerateTimelineAction();
    setRunning(false);

    if (result.error || !result.result) {
      setError(result.error ?? "Regenerierung fehlgeschlagen.");
      return;
    }

    setCount(result.result.count);
    setWarnings(result.result.warnings);
  }

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Baut die Timeline (Missions-Start/-Ende, Archiv-Ereignisse und
        <code> {"<!-- timeline -->"}</code>-Marker) vollständig aus dem
        aktuellen Datenbankstand neu auf.
      </p>

      <button
        type="button"
        onClick={handleStart}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? "Timeline wird aufgebaut…" : "Timeline neu generieren"}
      </button>

      {error && (
        <p className="text-lcars-red" role="alert">
          {error}
        </p>
      )}

      {count !== null && (
        <p className="text-lcars-amber">
          {count} Ereignisse aufgebaut.
          {warnings.length > 0 && (
            <>
              <br />
              {warnings.slice(0, 5).join(" · ")}
              {warnings.length > 5 && ` · … und ${warnings.length - 5} weitere`}
            </>
          )}
        </p>
      )}
    </div>
  );
}
