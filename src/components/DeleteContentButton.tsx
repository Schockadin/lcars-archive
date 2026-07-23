"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteContentAction } from "@/app/admin/contentDeleteActions";
import type { TrashContentType } from "@/lib/adminContent";
import { TrashIcon } from "@/lib/icons";

// Admin-only Löschen-Button in ActionsMenu.tsx — weich (deleted_at), siehe
// deleteContentAction. Nach Erfolg auf redirectTo navigieren: der Inhalt
// verschwindet aus allen *BySlug-Abfragen, die aktuelle Detailseite würde
// bei einem bloßen Re-Render sonst mit einem Notfound-Flackern enden.
export default function DeleteContentButton({
  contentType,
  id,
  redirectTo,
}: {
  contentType: TrashContentType;
  id: number;
  redirectTo: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-[4px]">
      <button
        type="button"
        disabled={pending}
        className="lcars-icon-btn self-start disabled:opacity-50 text-lcars-red border-lcars-red"
        aria-label="Löschen"
        title="Löschen"
        onClick={() => {
          if (!window.confirm("Diesen Inhalt wirklich löschen?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteContentAction(contentType, id);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.push(redirectTo);
          });
        }}
      >
        <TrashIcon />
      </button>
      {error && (
        <p className="lcars-link-text text-lcars-red text-[11px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
