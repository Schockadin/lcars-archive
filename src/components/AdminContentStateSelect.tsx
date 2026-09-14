"use client";
import {
  setContentStateAdminAction,
  type AdminVisibilityContentType,
} from "@/app/actions/visibility";
import { useOptimisticAdminSelect } from "@/hooks/useOptimisticAdminSelect";
import AdminSelectField from "./AdminSelectField";

type ContentState = "draft" | "published";

const OPTIONS: { value: ContentState; label: string }[] = [
  { value: "draft", label: "Entwurf" },
  { value: "published", label: "Veröffentlicht" },
];

// Veröffentlichen oder zurückziehen auf den Inhalts-Detailseiten (Charakter,
// Missionslog, Archiv-Eintrag/Gespräch) — mirrort OwnerSelect.tsx
// (useOptimisticAdminSelect: automatischer Rollback, falls die Action
// fehlschlägt). Anders als ContentStateSelect.tsx unter /user/content (nur
// die Owner-Person selbst) darf hier jede Person mit content.moderate JEDEN
// Inhalt umstellen.
export default function AdminContentStateSelect({
  contentType,
  id,
  isDraft,
}: {
  contentType: AdminVisibilityContentType;
  id: number;
  isDraft: boolean;
}) {
  const { value, pending, error, change } = useOptimisticAdminSelect<ContentState>(
    isDraft ? "draft" : "published",
    (next) => setContentStateAdminAction(contentType, id, next),
  );

  return (
    <AdminSelectField
      label="Veröffentlichung:"
      value={value}
      onChange={(v) => change(v as ContentState)}
      disabled={pending}
      options={OPTIONS}
      ariaLabel="Veröffentlichung"
      error={error}
    />
  );
}
