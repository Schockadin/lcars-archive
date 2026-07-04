"use client";
import { useState, useTransition } from "react";
import { setOwnerAction, type OwnerContentType } from "@/app/actions/owner";

// Admin-only Owner-Anzeige/-Änderung auf den vier Inhalts-Detailseiten
// (Charakter, Mission, Missionslog, Archiv-Eintrag) — mirrort
// VisibilitySelect.tsx (useState + useTransition statt Formular).
export default function OwnerSelect({
  contentType,
  id,
  initialOwnerId,
  users,
}: {
  contentType: OwnerContentType;
  id: number;
  initialOwnerId: number | null;
  users: { id: number; name: string }[];
}) {
  const [value, setValue] = useState<number | null>(initialOwnerId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className="lcars-eyebrow">Owner:</span>
      <select
        value={value ?? ""}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value ? Number(e.target.value) : null;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await setOwnerAction(contentType, id, next);
            if (result.error) setError(result.error);
          });
        }}
        className="lcars-input"
        aria-label="Owner"
      >
        <option value="">— kein Owner —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
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
