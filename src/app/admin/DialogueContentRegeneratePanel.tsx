"use client";
import { regenerateDialogueContentBatchAction } from "./dialogueContentActions";
import BatchScriptPanel from "./BatchScriptPanel";

// Admin-only (siehe page.tsx) — Backfill für bereits geschlossene Dialoge,
// die vor Einführung des Fließtext-Features (archive_entries.content/
// source_md aus dialogue_messages, siehe dialoguesCore.ts) abgeschlossen
// wurden. Neu abgeschlossene Dialoge brauchen das nicht — die bekommen ihren
// Fließtext automatisch. Läuft blockweise über BatchScriptPanel (siehe dort);
// ein erneuter Lauf ist gefahrlos (meldet dann 0 erzeugte Fließtexte).
export default function DialogueContentRegeneratePanel() {
  return (
    <BatchScriptPanel
      description={
        <>
          Erzeugt für alle bereits abgeschlossenen Gespräche OHNE bestehenden
          Fließtext (Vorlesbare Zusammenfassung statt Karten-Ansicht) einen —
          nötig einmalig für Dialoge, die vor Einführung dieses Features
          abgeschlossen wurden. Bereits vorhandener Fließtext bleibt dabei
          immer unverändert. Läuft in Blöcken mit Fortschrittsanzeige.
        </>
      }
      idleLabel="Erzeugen"
      runningLabel="Wird erzeugt…"
      batchSize={15}
      runBatch={regenerateDialogueContentBatchAction}
      initialTotals={{ changed: 0 }}
      accumulate={(totals, res) => ({
        changed: totals.changed + (res.changedInBatch ?? 0),
      })}
      renderCaption={({ processed, total, totals, done }) =>
        done ? (
          <span className="text-lcars-primary">
            Fertig: {totals.changed}{" "}
            {totals.changed === 1 ? "Fließtext" : "Fließtexte"} erzeugt
            {total === 0 ? " (nichts zu tun)" : ""}.
          </span>
        ) : (
          <>
            {processed}/{total} geprüft · {totals.changed} erzeugt
          </>
        )
      }
      failureMessage="Beim Erzeugen ist ein Fehler aufgetreten."
    />
  );
}
