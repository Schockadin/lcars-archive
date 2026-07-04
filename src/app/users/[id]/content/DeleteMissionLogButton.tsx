"use client";
import { useState, useTransition } from "react";
import { deleteMissionLogAction } from "./actions";

export default function DeleteMissionLogButton({ logId }: { logId: number }) {
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
