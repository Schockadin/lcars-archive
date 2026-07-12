"use client";
import { setOwnerAction, type OwnerContentType } from "@/app/actions/owner";
import { useOptimisticAdminSelect } from "@/hooks/useOptimisticAdminSelect";
import AdminSelectField from "./AdminSelectField";

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
    <AdminSelectField
      label="Owner:"
      value={value != null ? String(value) : ""}
      onChange={(v) => change(v ? Number(v) : null)}
      disabled={pending}
      options={[
        { value: "", label: "— kein Owner —" },
        ...users.map((u) => ({ value: String(u.id), label: u.name })),
      ]}
      ariaLabel="Owner"
      error={error}
    />
  );
}
