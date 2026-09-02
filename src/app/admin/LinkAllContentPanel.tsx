"use client";
import { linkAllContentBatchAction } from "@/app/actions/autolinkAll";
import BatchScriptPanel from "./BatchScriptPanel";

// Admin-only (siehe page.tsx) — wendet Autolinking auf ALLE bestehenden
// Inhalte an. Läuft blockweise über BatchScriptPanel (siehe dort), damit auch
// bei vielen Inhalten kein Request in ein Timeout läuft.
export default function LinkAllContentPanel() {
  return (
    <BatchScriptPanel
      description={
        <>
          Erkennt in allen bestehenden Inhalten erwähnte Charaktere, Missionen
          und Archiv-Einträge und verlinkt sie automatisch. Läuft in Blöcken mit
          Fortschrittsanzeige, um Timeouts zu vermeiden. Nur Inhalte mit neuen
          Verknüpfungen werden geändert.
        </>
      }
      idleLabel="Alle Inhalte verlinken"
      runningLabel="Verlinke alle Inhalte…"
      batchSize={15}
      runBatch={linkAllContentBatchAction}
      initialTotals={{ changed: 0, links: 0 }}
      accumulate={(totals, res) => ({
        changed: totals.changed + (res.changedInBatch ?? 0),
        links: totals.links + (res.linksInBatch ?? 0),
      })}
      renderCaption={({ processed, total, totals, done }) =>
        done ? (
          <span className="text-lcars-primary">
            Fertig: {totals.changed} von {total} Inhalten verlinkt (
            {totals.links} Verknüpfungen gesetzt).
          </span>
        ) : (
          <>
            {processed}/{total} geprüft · {totals.changed} Inhalte verlinkt ·{" "}
            {totals.links} Verknüpfungen
          </>
        )
      }
      failureMessage="Beim Verlinken ist ein Fehler aufgetreten."
    />
  );
}
