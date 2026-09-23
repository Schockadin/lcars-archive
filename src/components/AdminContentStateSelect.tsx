"use client";
import {
  setContentStateAdminAction,
  type AdminVisibilityContentType,
} from "@/app/actions/visibility";
import ContentStateSwitch from "@/components/ContentStateSwitch";

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
  const labelId = `content-state-label-${contentType}-${id}`;

  return (
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className="lcars-eyebrow" id={labelId}>
        Veröffentlichung:
      </span>
      <ContentStateSwitch
        isDraft={isDraft}
        action={(next) => setContentStateAdminAction(contentType, id, next)}
        ariaLabelledBy={labelId}
        errorPresentation="toast"
      />
    </div>
  );
}
