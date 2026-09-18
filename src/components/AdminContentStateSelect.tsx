"use client";
import {
  setContentStateAdminAction,
  type AdminVisibilityContentType,
} from "@/app/actions/visibility";
import { useOptimisticAdminSelect } from "@/hooks/useOptimisticAdminSelect";
// Direkt aus der Datei statt über den Barrel — siehe ContentStateSelect.tsx.
import LcarsSwitch from "@/components/lcars/Switch";
import { FormError } from "@/app/_shared/FormPrimitives";

type ContentState = "draft" | "published";

const OPTIONS: { key: ContentState; label: string }[] = [
  { key: "draft", label: "Entwurf" },
  { key: "published", label: "Veröffentlicht" },
];

// Veröffentlichen oder zurückziehen auf den Inhalts-Detailseiten (Charakter,
// Missionslog, Archiv-Eintrag/Gespräch) — mirrort OwnerSelect.tsx
// (useOptimisticAdminSelect: automatischer Rollback, falls die Action
// fehlschlägt). Anders als ContentStateSelect.tsx unter /user/content (nur
// die Owner-Person selbst) darf hier jede Person mit content.moderate JEDEN
// Inhalt umstellen.
//
// Zwei Knöpfe statt AdminSelectField (das bleibt für OwnerSelect, wo es viele
// Optionen sind): aus demselben Grund wie in ContentStateSelect.tsx — ein
// fokussiertes, geschlossenes <select> springt bei jedem Pfeiltasten-Druck
// zur nächsten Option und schreibt sie sofort weg, hier also von „Entwurf"
// auf „Veröffentlicht", ohne dass jemand es wollte.
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
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className="lcars-eyebrow" id={`content-state-label-${contentType}-${id}`}>
        Veröffentlichung:
      </span>
      <div
        role="group"
        aria-labelledby={`content-state-label-${contentType}-${id}`}
      >
        <LcarsSwitch
          className="content-state-switch"
          options={OPTIONS.map((o) => ({ ...o, disabled: pending }))}
          active={value}
          onChange={change}
        />
      </div>
      <FormError message={error ?? undefined} className="text-[12px]" />
    </div>
  );
}
