"use client";
import { embedAllBatchAction } from "./embeddingActions";
import BatchScriptPanel from "../BatchScriptPanel";

// Admin-only (siehe page.tsx) — Voll-Backfill des RAG-Vektor-Index
// (content_embeddings) für alle Inhalte. Nötig einmalig nach dem Einspielen
// der Migration (pgvector + Tabelle) bzw. dem Setzen des OPENAI_API_KEY, und
// als Reparatur, falls Fire-and-forget-Läufe (serverless) einzelne
// Aktualisierungen verpasst haben. Neu angelegte/bearbeitete Inhalte werden
// ohnehin automatisch (fire-and-forget) embedded. Läuft blockweise über
// BatchScriptPanel (siehe dort) — kleinere Blöcke als die übrigen Skripte,
// weil jeder Eintrag einen OpenAI-Aufruf kostet; ein erneuter Lauf ist
// gefahrlos (upsert ist idempotent).
export default function EmbeddingsBackfillPanel() {
  return (
    <BatchScriptPanel
      description={
        <>
          Erzeugt für ALLE Inhalte (Charaktere, Missionen, Berichte,
          Datenbank-Einträge und abgeschlossene Gespräche) die Vektor-Embeddings
          für den Datenbank-Assistenten. Einmalig nötig nach der Einrichtung
          (pgvector-Migration + OpenAI-Schlüssel) und als Reparatur, falls
          automatische Aktualisierungen verpasst wurden. Neu angelegte oder
          bearbeitete Inhalte werden ohnehin automatisch embedded. Erfordert
          einen gesetzten OpenAI-Schlüssel; ein erneuter Lauf ist gefahrlos.
          Läuft in Blöcken mit Fortschrittsanzeige.
        </>
      }
      idleLabel="Embeddings erzeugen"
      runningLabel="Wird erzeugt…"
      batchSize={5}
      runBatch={embedAllBatchAction}
      initialTotals={{ embedded: 0, removed: 0 }}
      accumulate={(totals, res) => ({
        embedded: totals.embedded + (res.embeddedInBatch ?? 0),
        removed: totals.removed + (res.removedInBatch ?? 0),
      })}
      renderCaption={({ processed, total, totals, done }) =>
        done ? (
          <span className="text-lcars-primary-ink">
            Fertig: {totals.embedded}{" "}
            {totals.embedded === 1 ? "Inhalt" : "Inhalte"} embedded
            {totals.removed > 0
              ? `, ${totals.removed} ohne Text übersprungen`
              : ""}
            {total === 0 ? " (nichts zu tun)" : ""}.
          </span>
        ) : (
          <>
            {processed}/{total} verarbeitet · {totals.embedded} embedded
          </>
        )
      }
      failureMessage="Beim Erzeugen der Embeddings ist ein Fehler aufgetreten."
    />
  );
}
