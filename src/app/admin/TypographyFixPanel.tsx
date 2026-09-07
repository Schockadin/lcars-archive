"use client";
import { typographyFixBatchAction } from "@/app/actions/typographyFix";
import BatchScriptPanel from "./BatchScriptPanel";

// Admin-only (siehe page.tsx) — korrigiert die Typografie (deutsche
// Anführungszeichen „…“) in ALLEN bestehenden Inhalten. Läuft blockweise über
// BatchScriptPanel, das sich dieses Panel mit den übrigen Admin-Skripten
// teilt: der Client ruft die Action wiederholt mit wachsendem Offset auf, bis
// alle Inhalte abgearbeitet sind — so bleibt jeder Server-Request klein und
// läuft nicht in ein Timeout.
export default function TypographyFixPanel() {
  return (
    <BatchScriptPanel
      description={
        <>
          Wandelt gerade Anführungszeichen ({'"'}) in allen bestehenden Inhalten
          in deutsche typografische Anführungszeichen („…“) um und rendert die
          Inhalte neu. Läuft in Blöcken mit Fortschrittsanzeige. Nur Inhalte mit
          tatsächlichen Änderungen werden gespeichert (ein zweiter Lauf meldet
          0).
        </>
      }
      idleLabel="Typografie korrigieren"
      runningLabel="Korrigiere Typografie…"
      batchSize={15}
      runBatch={typographyFixBatchAction}
      initialTotals={{ changed: 0 }}
      accumulate={(totals, res) => ({
        changed: totals.changed + (res.changedInBatch ?? 0),
      })}
      renderCaption={({ processed, total, totals, done }) =>
        done ? (
          <span className="text-lcars-primary-ink">
            Fertig: {totals.changed} von {total} Inhalten korrigiert.
          </span>
        ) : (
          <>
            {processed}/{total} geprüft · {totals.changed} korrigiert
          </>
        )
      }
      failureMessage="Bei der Typografie-Korrektur ist ein Fehler aufgetreten."
    />
  );
}
