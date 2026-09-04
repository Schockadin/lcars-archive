"use client";
import { useState, type ReactNode } from "react";
import ScriptProgress from "./ScriptProgress";

// Gemeinsames Bedienfeld der Batch-Skripte in der Administration
// (Bulk-Autolinking, Typografie-Korrektur, Gespräche-Fließtext,
// RAG-Embeddings). Alle vier arbeiten gleich: ein Knopf startet einen Lauf,
// der die zugehörige Server-Action so lange mit wachsendem Offset aufruft,
// bis sie „fertig" meldet — jeder einzelne Request bleibt klein und läuft
// nicht in ein Timeout. Dazwischen wächst ein Fortschrittsbalken, am Ende
// steht eine Bilanz.
//
// Bis auf Action, Blockgröße, Texte und die mitgezählten Kennzahlen war
// dieser Ablauf in jedem der vier Panels wortgleich kopiert.

// Was jede Batch-Action mindestens zurückgibt. `processed` ist der neue
// Offset (Standard: total, wenn die Action nichts anderes sagt).
export interface BatchResult {
  error?: string;
  total?: number;
  processed?: number;
  done?: boolean;
}

export default function BatchScriptPanel<
  Totals extends Record<string, number>,
  Result extends BatchResult,
>({
  description,
  idleLabel,
  runningLabel,
  batchSize,
  runBatch,
  initialTotals,
  accumulate,
  renderCaption,
  failureMessage,
}: {
  description: ReactNode;
  // Beschriftung des Knopfes im Ruhezustand bzw. während des Laufs.
  idleLabel: string;
  runningLabel: string;
  batchSize: number;
  runBatch: (offset: number, batchSize: number) => Promise<Result>;
  // Kennzahlen, die über die Blöcke hinweg aufaddiert werden (z.B. geänderte
  // Inhalte, gesetzte Verknüpfungen) — Form und Bedeutung bestimmt das
  // jeweilige Panel.
  initialTotals: Totals;
  accumulate: (totals: Totals, result: Result) => Totals;
  renderCaption: (state: {
    processed: number;
    total: number;
    totals: Totals;
    done: boolean;
  }) => ReactNode;
  // Meldung für einen unerwarteten Fehler (Netzwerk/Abbruch); die
  // fachlichen Fehler kommen als result.error aus der Action.
  failureMessage: string;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
    totals: Totals;
  } | null>(null);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setDone(false);
    setProgress(null);
    setDismissed(false);

    let offset = 0;
    let totals = initialTotals;

    try {
      for (;;) {
        const res = await runBatch(offset, batchSize);
        if (res.error) {
          setError(res.error);
          return;
        }
        totals = accumulate(totals, res);
        const total = res.total ?? 0;
        const processed = res.processed ?? total;
        setProgress({ processed, total, totals });

        if (res.done || total === 0) {
          setDone(true);
          return;
        }
        offset = processed;
      }
    } catch (err) {
      console.error(failureMessage, err);
      setError(failureMessage);
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
      <p className="text-lcars-ink-dim text-[13px]">{description}</p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? runningLabel : idleLabel}
      </button>

      {progress && !dismissed && (
        <ScriptProgress
          pct={pct}
          onDismiss={() => setDismissed(true)}
          caption={renderCaption({ ...progress, done })}
        />
      )}

      {error && (
        <p className="text-lcars-quinary-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
