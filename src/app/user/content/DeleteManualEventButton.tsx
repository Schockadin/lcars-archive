"use client";
import { useState, useTransition } from "react";
import { deleteManualEventAction } from "@/app/actions/timelineEvents";
import { TrashIcon } from "@/lib/icons";

export default function DeleteManualEventButton({
  id,
  onOptimisticDelete,
}: {
  id: number;
  onOptimisticDelete: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-[4px]">
      <button
        type="button"
        disabled={pending}
        className="lcars-icon-btn lcars-icon-btn--danger disabled:opacity-50"
        aria-label="Event löschen"
        title="Event löschen"
        onClick={() => {
          if (!window.confirm("Dieses Ereignis wirklich löschen?")) return;
          setError(null);
          startTransition(async () => {
            onOptimisticDelete();
            const data = new FormData();
            data.set("id", String(id));
            const result = await deleteManualEventAction({}, data);
            if (result.error) setError(result.error);
          });
        }}
      >
        <TrashIcon />
      </button>
      {error && (
        <p
          className="lcars-link-text text-lcars-quinary-ink text-[11px]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
