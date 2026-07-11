"use client";
import { setOwnerAction, type OwnerContentType } from "@/app/actions/owner";
import { useOptimisticAdminSelect } from "@/hooks/useOptimisticAdminSelect";

// Admin-only Owner-Anzeige/-Änderung auf den vier Inhalts-Detailseiten
// (Charakter, Mission, Missionslog, Archiv-Eintrag) — mirrort
// VisibilitySelect.tsx/AdminVisibilitySelect.tsx (useOptimisticAdminSelect:
// automatischer Rollback, falls setOwnerAction fehlschlägt).
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
  const { value, pending, error, change } = useOptimisticAdminSelect(
    initialOwnerId,
    (next) => setOwnerAction(contentType, id, next),
  );

  return (
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className="lcars-eyebrow">Owner:</span>
      <select
        value={value ?? ""}
        disabled={pending}
        onChange={(e) => change(e.target.value ? Number(e.target.value) : null)}
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
