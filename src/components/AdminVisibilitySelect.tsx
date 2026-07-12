"use client";
import {
  setVisibilityAdminAction,
  type AdminVisibilityContentType,
} from "@/app/actions/visibility";
import { useOptimisticAdminSelect } from "@/hooks/useOptimisticAdminSelect";
import AdminSelectField from "./AdminSelectField";
import type { Visibility } from "@/lib/visibility";

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "private", label: "Privat" },
  { value: "gm", label: "GM" },
  { value: "public", label: "Öffentlich" },
];

// Admin-only Sichtbarkeit-Anzeige/-Änderung auf den Inhalts-Detailseiten
// (Charakter, Missionslog, Archiv-Eintrag/Gespräch) — mirrort OwnerSelect.tsx
// (useOptimisticAdminSelect: automatischer Rollback, falls
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
  const { value, pending, error, change } = useOptimisticAdminSelect(
    initialValue,
    (next) => setVisibilityAdminAction(contentType, id, next),
  );

  return (
    <AdminSelectField
      label="Sichtbarkeit:"
      value={value}
      onChange={(v) => change(v as Visibility)}
      disabled={pending}
      options={OPTIONS}
      ariaLabel="Sichtbarkeit"
      error={error}
    />
  );
}
