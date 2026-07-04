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
        className="text-lcars-red text-[12px] underline disabled:opacity-50"
        onClick={() => {
          if (!window.confirm("Diesen Missionslog wirklich löschen?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteMissionLogAction(logId);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? "Wird gelöscht…" : "Löschen"}
      </button>
      {error && (
        <p className="text-lcars-red text-[11px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
