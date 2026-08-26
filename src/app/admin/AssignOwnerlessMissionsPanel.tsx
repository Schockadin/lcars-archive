"use client";
import { useState } from "react";
import { assignOwnerlessMissionsBatchAction } from "./missionOwnerActions";
import ScriptProgress from "./ScriptProgress";

const BATCH_SIZE = 25;

interface Progress {
  processed: number;
  total: number;
}

export default function AssignOwnerlessMissionsPanel({
  gms,
}: {
  gms: { id: number; name: string }[];
}) {
  const [ownerId, setOwnerId] = useState<number | "">(gms[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleAssign() {
    if (ownerId === "") return;
    setRunning(true);
    setError(null);
    setProgress(null);
    setDone(false);
    setDismissed(false);

    let total: number | null = null;

    try {
      for (;;) {
        const res = await assignOwnerlessMissionsBatchAction(
          ownerId,
          BATCH_SIZE,
        );
        if (res.error) {
          setError(res.error);
          return;
        }
        const assignedInBatch = res.assignedInBatch ?? 0;
        const remaining = res.remaining ?? 0;
        if (total === null) total = assignedInBatch + remaining;
        setProgress({ processed: total - remaining, total });

        if (remaining === 0 || assignedInBatch === 0) {
          setDone(true);
          return;
        }
      }
    } catch {
      setError("Beim Zuordnen ist ein Fehler aufgetreten.");
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
        Weist alle Missionen ohne Owner (meist per Vault-Ingest entstanden) auf
        einen Schlag der ausgewählten Spielleitung zu. Bereits zugeordnete
        Missionen bleiben unangetastet. Läuft in Blöcken mit Fortschrittsanzeige.
      </p>

      <div className="flex flex-wrap items-center gap-[8px]">
        <select
          value={ownerId}
          onChange={(e) => setOwnerId(Number(e.target.value))}
          className="rounded-lcars-pill lcars-input"
          disabled={running || gms.length === 0}
        >
          {gms.length === 0 && (
            <option value="">Keine Spielleitung vorhanden</option>
          )}
          {gms.map((gm) => (
            <option key={gm.id} value={gm.id}>
              {gm.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleAssign}
          disabled={running || ownerId === ""}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          {running ? "Wird zugeordnet…" : "Zuordnen"}
        </button>
      </div>

      {progress && !dismissed && (
        <ScriptProgress
          pct={pct}
          onDismiss={() => setDismissed(true)}
          caption={
            done ? (
              <span className="text-lcars-primary">
                {progress.total === 0
                  ? "Keine Missionen ohne Owner gefunden."
                  : `${progress.total} ${
                      progress.total === 1 ? "Mission" : "Missionen"
                    } zugeordnet.`}
              </span>
            ) : (
              <>
                {progress.processed}/{progress.total} zugeordnet
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
