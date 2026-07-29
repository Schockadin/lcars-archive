"use client";
import { useState } from "react";
import { linkAllContentBatchAction } from "@/app/actions/autolinkAll";
import ScriptProgress from "./ScriptProgress";

const BATCH_SIZE = 15;

interface Progress {
  processed: number;
  total: number;
  changed: number;
  links: number;
}

// Admin-only (siehe page.tsx) — wendet Autolinking auf ALLE bestehenden
// Inhalte an. Arbeitet BATCH-weise (seriell) und zeigt einen
// Fortschrittsbalken: der Client ruft linkAllContentBatchAction wiederholt mit
// wachsendem offset auf, bis alle Inhalte abgearbeitet sind. So bleibt jeder
// einzelne Server-Request klein und läuft nicht in ein Timeout, auch bei
// vielen Inhalten.
export default function LinkAllContentPanel() {
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
    let links = 0;

    try {
      for (;;) {
        const res = await linkAllContentBatchAction(offset, BATCH_SIZE);
        if (res.error) {
          setError(res.error);
          return;
        }
        changed += res.changedInBatch ?? 0;
        links += res.linksInBatch ?? 0;
        const total = res.total ?? 0;
        const processed = res.processed ?? total;
        setProgress({ processed, total, changed, links });

        if (res.done || total === 0) {
          setDone(true);
          return;
        }
        offset = processed;
      }
    } catch (err) {
      // Unerwarteter Fehler (Netzwerk/Abbruch) — die eigentliche
      // Berechtigungsprüfung kommt jetzt als res.error oben an, nicht mehr hier.
      console.error("Autolink fehlgeschlagen:", err);
      setError("Beim Verlinken ist ein Fehler aufgetreten.");
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
        Erkennt in allen bestehenden Inhalten erwähnte Charaktere, Missionen und
        Archiv-Einträge und verlinkt sie automatisch. Läuft in Blöcken mit
        Fortschrittsanzeige, um Timeouts zu vermeiden. Nur Inhalte mit neuen
        Verknüpfungen werden geändert.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? "Verlinke alle Inhalte…" : "Alle Inhalte verlinken"}
      </button>

      {progress && !dismissed && (
        <ScriptProgress
          pct={pct}
          onDismiss={() => setDismissed(true)}
          caption={
            done ? (
              <span className="text-lcars-amber">
                Fertig: {progress.changed} von {progress.total} Inhalten verlinkt
                ({progress.links} Verknüpfungen gesetzt).
              </span>
            ) : (
              <>
                {progress.processed}/{progress.total} geprüft · {progress.changed}{" "}
                Inhalte verlinkt · {progress.links} Verknüpfungen
              </>
            )
          }
        />
      )}

      {error && (
        <p className="text-lcars-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
