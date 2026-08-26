"use client";
import { useState } from "react";
import { regenerateDialogueContentBatchAction } from "./dialogueContentActions";
import ScriptProgress from "./ScriptProgress";

const BATCH_SIZE = 15;

interface Progress {
  processed: number;
  total: number;
  changed: number;
}

// Admin-only (siehe page.tsx) — Backfill für bereits geschlossene Dialoge,
// die vor Einführung des Fließtext-Features (archive_entries.content/
// source_md aus dialogue_messages, siehe dialoguesCore.ts) abgeschlossen
// wurden. Neu abgeschlossene Dialoge brauchen das nicht — die bekommen
// ihren Fließtext automatisch. Läuft BATCH-weise (seriell) mit
// Fortschrittsbalken, damit auch viele Dialoge nicht in ein Timeout laufen;
// ein erneuter Lauf ist gefahrlos (meldet dann 0 erzeugte Fließtexte).
export default function DialogueContentRegeneratePanel() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setDone(false);
    setProgress(null);
    setDismissed(false);

    let offset = 0;
    let changed = 0;

    try {
      for (;;) {
        const res = await regenerateDialogueContentBatchAction(
          offset,
          BATCH_SIZE,
        );
        if (res.error) {
          setError(res.error);
          return;
        }
        changed += res.changedInBatch ?? 0;
        const total = res.total ?? 0;
        const processed = res.processed ?? total;
        setProgress({ processed, total, changed });

        if (res.done || total === 0) {
          setDone(true);
          return;
        }
        offset = processed;
      }
    } catch {
      setError("Beim Erzeugen ist ein Fehler aufgetreten.");
    } finally {
      setRunning(false);
    }
  }

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Erzeugt für alle bereits abgeschlossenen Gespräche OHNE bestehenden
        Fließtext (Vorlesbare Zusammenfassung statt Karten-Ansicht) einen
        — nötig einmalig für Dialoge, die vor Einführung dieses Features
        abgeschlossen wurden. Bereits vorhandener Fließtext bleibt dabei
        immer unverändert. Läuft in Blöcken mit Fortschrittsanzeige.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? "Wird erzeugt…" : "Erzeugen"}
      </button>

      {progress && !dismissed && (
        <ScriptProgress
          pct={pct}
          onDismiss={() => setDismissed(true)}
          caption={
            done ? (
              <span className="text-lcars-primary">
                Fertig: {progress.changed}{" "}
                {progress.changed === 1 ? "Fließtext" : "Fließtexte"} erzeugt
                {progress.total === 0 ? " (nichts zu tun)" : ""}.
              </span>
            ) : (
              <>
                {progress.processed}/{progress.total} geprüft · {progress.changed}{" "}
                erzeugt
              </>
            )
          }
        />
      )}

      {error && (
        <p className="text-lcars-quinary" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
