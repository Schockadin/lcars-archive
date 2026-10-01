"use client";

import { linkOwnContentBatchAction } from "./linkOwnContentAction";
import BatchScriptPanel from "@/app/admin/BatchScriptPanel";

export default function LinkOwnContentPanel() {
  return (
    <BatchScriptPanel
      description={
        <>
          Erkennt in deinen Charakteren, Missionen, Synopsis-Blöcken, Logbüchern
          und Datenbank-Einträgen bekannte Namen und verlinkt sie automatisch.
          Gespräche bleiben dabei unberührt. Läuft in kleinen Blöcken; nur
          Inhalte mit neuen Verknüpfungen werden geändert.
        </>
      }
      idleLabel="Alles verlinken"
      runningLabel="Verlinke deine Inhalte…"
      batchSize={15}
      runBatch={linkOwnContentBatchAction}
      initialTotals={{ changed: 0, links: 0 }}
      accumulate={(totals, result) => ({
        changed: totals.changed + (result.changedInBatch ?? 0),
        links: totals.links + (result.linksInBatch ?? 0),
      })}
      renderCaption={({ processed, total, totals, done }) =>
        done ? (
          <span className="text-lcars-primary-ink">
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
      failureMessage="Beim Verlinken deiner Inhalte ist ein Fehler aufgetreten."
    />
  );
}
