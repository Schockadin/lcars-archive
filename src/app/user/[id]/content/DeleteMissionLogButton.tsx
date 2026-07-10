"use client";
import { useState, useTransition } from "react";
import { deleteMissionLogAction } from "./actions";

export default function DeleteMissionLogButton({
  logId,
  onOptimisticDelete,
}: {
  logId: number;
  // Von UserContentBrowser.tsx übergeben (dessen useOptimistic-Dispatch) —
  // wird innerhalb derselben Transition wie der Action-Aufruf ausgelöst,
  // damit React den Log sofort aus der Liste entfernt und bei einem
  // Fehlschlag automatisch wieder zurückholt (kein manueller Rollback-Code
  // hier nötig).
  onOptimisticDelete: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-[4px]">
      <button
        type="button"
        disabled={pending}
        className="lcars-link-text bg-lcars-bg disabled:opacity-50 border-none font-lcars text-lcars-red text-[14px] hover:text-lcars-amber-light"
        onClick={() => {
          if (!window.confirm("Diesen Missionslog wirklich löschen?")) return;
          setError(null);
          startTransition(async () => {
            onOptimisticDelete();
            const result = await deleteMissionLogAction(logId);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? "Löschen…" : "Löschen"}
      </button>
      {error && (
        <p className="lcars-link-text text-lcars-red text-[11px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
