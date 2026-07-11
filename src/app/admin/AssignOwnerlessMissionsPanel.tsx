"use client";
import { useState } from "react";
import { assignOwnerlessMissionsAction } from "./missionOwnerActions";

export default function AssignOwnerlessMissionsPanel({
  gms,
}: {
  gms: { id: number; name: string }[];
}) {
  const [ownerId, setOwnerId] = useState<number | "">(gms[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (ownerId === "") return;
    setRunning(true);
    setError(null);
    setCount(null);

    const result = await assignOwnerlessMissionsAction(ownerId);
    setRunning(false);

    if (result.error || result.count === undefined) {
      setError(result.error ?? "Zuordnung fehlgeschlagen.");
      return;
    }
    setCount(result.count);
  }

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Weist alle Missionen ohne Owner (meist per Vault-Ingest entstanden) auf
        einen Schlag der ausgewählten Spielleitung zu. Bereits zugeordnete
        Missionen bleiben unangetastet.
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

      {error && (
        <p className="text-lcars-red" role="alert">
          {error}
        </p>
      )}

      {count !== null && (
        <p className="text-lcars-amber">
          {count === 0
            ? "Keine Missionen ohne Owner gefunden."
            : `${count} ${count === 1 ? "Mission" : "Missionen"} zugeordnet.`}
        </p>
      )}
    </div>
  );
}
