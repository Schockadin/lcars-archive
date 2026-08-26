"use client";
import { useState } from "react";
import { typographyFixBatchAction } from "@/app/actions/typographyFix";
import ScriptProgress from "./ScriptProgress";

const BATCH_SIZE = 15;

interface Progress {
  processed: number;
  total: number;
  changed: number;
}

// Admin-only (siehe page.tsx) — korrigiert die Typografie (deutsche
// Anführungszeichen „…") in ALLEN bestehenden Inhalten. Arbeitet BATCH-weise
// (seriell) mit Fortschrittsbalken: der Client ruft typographyFixBatchAction
// wiederholt mit wachsendem offset auf, bis alle Inhalte abgearbeitet sind — so
// bleibt jeder Server-Request klein und läuft nicht in ein Timeout.
export default function TypographyFixPanel() {
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
        const res = await typographyFixBatchAction(offset, BATCH_SIZE);
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
    } catch (err) {
      console.error("Typografie-Korrektur fehlgeschlagen:", err);
      setError("Bei der Typografie-Korrektur ist ein Fehler aufgetreten.");
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
      <p className="text-lcars-ink-dim text-[13px]">
        Wandelt gerade Anführungszeichen ({'"'}) in allen bestehenden Inhalten
        in deutsche typografische Anführungszeichen („…“) um und rendert die
        Inhalte neu. Läuft in Blöcken mit Fortschrittsanzeige. Nur Inhalte mit
        tatsächlichen Änderungen werden gespeichert (ein zweiter Lauf meldet 0).
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? "Korrigiere Typografie…" : "Typografie korrigieren"}
      </button>

      {progress && !dismissed && (
        <ScriptProgress
          pct={pct}
          onDismiss={() => setDismissed(true)}
          caption={
            done ? (
              <span className="text-lcars-primary">
                Fertig: {progress.changed} von {progress.total} Inhalten
                korrigiert.
              </span>
            ) : (
              <>
                {progress.processed}/{progress.total} geprüft · {progress.changed}{" "}
                korrigiert
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
