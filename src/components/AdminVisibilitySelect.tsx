"use client";
import { useOptimistic, useState, useTransition } from "react";
import {
  setVisibilityAdminAction,
  type AdminVisibilityContentType,
} from "@/app/actions/visibility";
import type { Visibility } from "@/lib/visibility";

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "private", label: "Privat" },
  { value: "gm", label: "GM" },
  { value: "public", label: "Öffentlich" },
];

// Admin-only Sichtbarkeit-Anzeige/-Änderung auf den Inhalts-Detailseiten
// (Charakter, Missionslog, Archiv-Eintrag/Gespräch) — mirrort OwnerSelect.tsx
// (useOptimistic statt useState: automatischer Rollback, falls
// setVisibilityAdminAction fehlschlägt). Anders als VisibilitySelect.tsx
// unter /user/content (nur der Owner selbst) darf hier jeder Admin JEDEN
// Inhalt umstellen, siehe canSetVisibility in lib/visibility.ts.
export default function AdminVisibilitySelect({
  contentType,
  id,
  initialValue,
}: {
  contentType: AdminVisibilityContentType;
  id: number;
  initialValue: Visibility;
}) {
  const [optimisticValue, setOptimisticValue] = useOptimistic(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className="lcars-eyebrow">Sichtbarkeit:</span>
      <select
        value={optimisticValue}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Visibility;
          setError(null);
          startTransition(async () => {
            setOptimisticValue(next);
            const result = await setVisibilityAdminAction(contentType, id, next);
            if (result.error) setError(result.error);
          });
        }}
        className="lcars-input"
        aria-label="Sichtbarkeit"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-lcars-red text-[12px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
