"use client";
import { useActionState, useState, type ReactNode } from "react";
import {
  updateMissionSynopsisAction,
  type MissionSynopsisEditState,
} from "@/app/actions/missions";
import TimelineMarkerButton from "@/app/users/_shared/TimelineMarkerButton";
import AutoLinkCheckbox from "@/app/users/_shared/AutoLinkCheckbox";

const initialState: MissionSynopsisEditState = {};

// Inline-Editor für die Mission-Synopsis, nur für Admin/GM gerendert (siehe
// MissionSynopsis.tsx). `topRow` (FollowButtons + OwnerSelect) wird zusammen
// mit dem Bearbeiten-Button in einer gemeinsamen Zeile gerendert, `adminActions`
// (AdminActionsMenu) als eigener Block darunter — es ist ein volles
// DataRow-Akkordeon und passt nicht in die schmale Button-Zeile. Zeigt
// standardmäßig den gerenderten Body; im Editiermodus ein Markdown-Textfeld
// statt dessen.
export default function MissionSynopsisEditor({
  missionId,
  bodyHtml,
  sourceMarkdown,
  topRow,
  adminActions,
}: {
  missionId: number;
  bodyHtml: string | null;
  sourceMarkdown: string;
  topRow: ReactNode;
  adminActions?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
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
    if (state.success) setEditing(false);
  }

  const displayHtml = state.updatedHtml ?? bodyHtml;

  if (!editing) {
    return (
      <div className="flex flex-col gap-[8px]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-[10px]">
          {topRow}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="lcars-switch"
          >
            Synopsis bearbeiten
          </button>
        </div>

        {adminActions}

        {displayHtml ? (
          <div
            className="mission-body lcars-text"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ) : (
          <p className="lcars-empty-state">Keine Zusammenfassung vorhanden</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-[10px]">
        {topRow}
      </div>

      {adminActions}

      {/* Kein isAdminOrGM-Prop nötig — MissionSynopsisEditor wird
          ausschließlich für viewer?.role === "admin"/"gm" gerendert (siehe
          MissionSynopsis.tsx), der Timeline-Marker-Button ist hier also
          implizit immer erlaubt. */}
      <TimelineMarkerButton textareaId={`mission-synopsis-${missionId}`} />

      <form action={formAction} className="flex flex-col gap-[8px]">
        <input type="hidden" name="missionId" value={missionId} />
        <textarea
          id={`mission-synopsis-${missionId}`}
          name="bodyMarkdown"
          required
          defaultValue={sourceMarkdown}
          className="rounded-lcars-pill lcars-input min-h-[300px] resize-y font-mono"
        />

        <AutoLinkCheckbox idPrefix={`mission-synopsis-${missionId}`} />

        <div className="flex flex-wrap gap-[12px] items-center justify-end">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="lcars-switch"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="lcars-switch disabled:opacity-50"
          >
            {pending ? "Speichern…" : "Speichern"}
          </button>
        </div>

        {state.error && (
          <p className="text-lcars-red text-[13px]" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
