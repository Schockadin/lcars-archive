"use client";
import { useActionState, useState } from "react";
import {
  updateMissionSynopsisAction,
  type MissionSynopsisEditState,
} from "@/app/actions/missions";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import ContentBody from "@/components/ContentBody";
import { CheckIcon, XIcon } from "@/lib/icons";

const initialState: MissionSynopsisEditState = {};

// Inline-Editor für die Mission-Synopsis, nur für Admin/GM gerendert (siehe
// MissionSynopsis.tsx). Zeigt standardmäßig den gerenderten Body; im
// Editiermodus ein Markdown-Textfeld statt dessen.
export default function MissionSynopsisEditor({
  missionId,
  bodyHtml,
  sourceMarkdown,
  editMode,
  onEditModeChange,
}: {
  missionId: number;
  bodyHtml: string | null;
  sourceMarkdown: string;
  slug: string;
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateMissionSynopsisAction,
    initialState,
  );

  // useActionState liefert bei jedem Dispatch ein neues state-Objekt (auch
  // bei wiederholtem success:true) — der Referenzvergleich (statt eines
  // simplen state.success-Werts) erkennt deshalb JEDEN abgeschlossenen
  // Speichervorgang, nicht nur den ersten. Direkt im Render-Body statt in
  // einem Effect angepasst (React-Pattern "Adjusting state when a prop
  // changes"), damit kein zusätzlicher Render-Zyklus nötig ist.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) onEditModeChange(false);
  }

  const displayHtml = state.updatedHtml ?? bodyHtml;

  if (!editMode) {
    return (
      <div className="flex flex-col gap-[8px]">
        {displayHtml ? (
          <ContentBody html={displayHtml} />
        ) : (
          <p className="lcars-empty-state">Keine Zusammenfassung vorhanden</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <form action={formAction} className="flex flex-col gap-[8px]">
        <input type="hidden" name="missionId" value={missionId} />
        {/* isAdminOrGM fest true — MissionSynopsisEditor wird ausschließlich
            für viewer?.role === "admin"/"gm" gerendert (siehe
            MissionSynopsis.tsx), der Timeline-Marker-Button ist hier also
            implizit immer erlaubt. */}
        <MarkdownEditor
          id={`mission-synopsis-${missionId}`}
          required
          defaultValue={sourceMarkdown}
          isAdminOrGM
          insertImage={{ contentType: "mission", contentId: missionId }}
        />

        <AutoLinkCheckbox idPrefix={`mission-synopsis-${missionId}`} />

        <div className="flex gap-[12px] items-center justify-end">
          <button
            type="button"
            onClick={() => onEditModeChange(false)}
            className="lcars-icon-btn lcars-icon-btn--danger size-[40px]"
            aria-label="Abbrechen"
            title="Abbrechen"
          >
            <XIcon />
          </button>
          <button
            type="submit"
            disabled={pending}
            className="lcars-icon-btn size-[40px] disabled:opacity-50"
            aria-label={pending ? "Wird gespeichert…" : "Speichern"}
            title={pending ? "Wird gespeichert…" : "Speichern"}
          >
            <CheckIcon />
          </button>
        </div>

        {state.error && (
          <p className="text-lcars-quinary-ink text-[13px]" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
