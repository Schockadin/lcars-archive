"use client";
import { useState, useTransition } from "react";
import { deleteOwnContentAction, type DeleteContentType } from "./actions";
import { TrashIcon } from "@/lib/icons";

// Generischer Icon-Löschen-Button für "Meine Inhalte" — ersetzt das
// vorherige, nur für Mission-Logs gebaute DeleteMissionLogButton.tsx, jetzt
// über alle fünf löschbaren Inhaltstypen hinweg (deleteOwnContentAction
// scoped die eigentliche Berechtigung serverseitig).
export default function DeleteOwnContentButton({
  contentType,
  id,
  onOptimisticDelete,
}: {
  contentType: DeleteContentType;
  id: number;
  // Von UserContentBrowser.tsx übergeben (dessen jeweiliger
  // useOptimistic-Dispatch) — wird innerhalb derselben Transition wie der
  // Action-Aufruf ausgelöst, damit React den Eintrag sofort aus der Liste
  // entfernt und bei einem Fehlschlag automatisch wieder zurückholt (kein
  // manueller Rollback-Code hier nötig).
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
        aria-label="Löschen"
        title="Löschen"
        onClick={() => {
          if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;
          setError(null);
          startTransition(async () => {
            onOptimisticDelete();
            const result = await deleteOwnContentAction(contentType, id);
            if (result.error) setError(result.error);
          });
        }}
      >
        <TrashIcon />
      </button>
      {error && (
        <p className="lcars-link-text text-lcars-quinary-ink text-[11px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
