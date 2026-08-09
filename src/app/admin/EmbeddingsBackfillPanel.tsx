"use client";
import { useState } from "react";
import { embedAllBatchAction } from "./embeddingActions";
import ScriptProgress from "./ScriptProgress";

const BATCH_SIZE = 5;

interface Progress {
  processed: number;
  total: number;
  embedded: number;
  removed: number;
}

// Admin-only (siehe page.tsx) — Voll-Backfill des RAG-Vektor-Index
// (content_embeddings) für alle Inhalte. Nötig einmalig nach dem Einspielen
// der Migration (pgvector + Tabelle) bzw. dem Setzen des OPENAI_API_KEY, und
// als Reparatur, falls Fire-and-forget-Läufe (serverless) einzelne
// Aktualisierungen verpasst haben. Neu angelegte/bearbeitete Inhalte werden
// ohnehin automatisch (fire-and-forget) embedded. Läuft BATCH-weise (seriell)
// mit Fortschrittsbalken, damit auch ein größerer Korpus nicht in ein Timeout
// läuft; ein erneuter Lauf ist gefahrlos (upsert ist idempotent).
export default function EmbeddingsBackfillPanel() {
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
    let embedded = 0;
    let removed = 0;

    try {
      for (;;) {
        const res = await embedAllBatchAction(offset, BATCH_SIZE);
        if (res.error) {
          setError(res.error);
          return;
        }
        embedded += res.embeddedInBatch ?? 0;
        removed += res.removedInBatch ?? 0;
        const total = res.total ?? 0;
        const processed = res.processed ?? total;
        setProgress({ processed, total, embedded, removed });

        if (res.done || total === 0) {
          setDone(true);
          return;
        }
        offset = processed;
      }
    } catch {
      setError("Beim Erzeugen der Embeddings ist ein Fehler aufgetreten.");
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
        Erzeugt für ALLE Inhalte (Charaktere, Missionen, Berichte,
        Archiv-Einträge und abgeschlossene Gespräche) die Vektor-Embeddings
        für den Archiv-Assistenten. Einmalig nötig nach der Einrichtung
        (pgvector-Migration + OpenAI-Schlüssel) und als Reparatur, falls
        automatische Aktualisierungen verpasst wurden. Neu angelegte oder
        bearbeitete Inhalte werden ohnehin automatisch embedded. Erfordert
        einen gesetzten OpenAI-Schlüssel; ein erneuter Lauf ist gefahrlos.
        Läuft in Blöcken mit Fortschrittsanzeige.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running ? "Wird erzeugt…" : "Embeddings erzeugen"}
      </button>

      {progress && !dismissed && (
        <ScriptProgress
          pct={pct}
          onDismiss={() => setDismissed(true)}
          caption={
            done ? (
              <span className="text-lcars-amber">
                Fertig: {progress.embedded}{" "}
                {progress.embedded === 1 ? "Inhalt" : "Inhalte"} embedded
                {progress.removed > 0
                  ? `, ${progress.removed} ohne Text übersprungen`
                  : ""}
                {progress.total === 0 ? " (nichts zu tun)" : ""}.
              </span>
            ) : (
              <>
                {progress.processed}/{progress.total} verarbeitet ·{" "}
                {progress.embedded} embedded
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
