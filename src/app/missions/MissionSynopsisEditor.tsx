"use client";
import { useActionState, useState } from "react";
import {
  updateMissionSynopsisAction,
  type MissionSynopsisEditState,
} from "@/app/actions/missions";

const initialState: MissionSynopsisEditState = {};

// Inline-Editor für die Mission-Synopsis, nur für Admin/GM gerendert (siehe
// MissionSynopsis.tsx). Zeigt standardmäßig den gerenderten Body mit einem
// Bearbeiten-Link; im Editiermodus ein Markdown-Textfeld statt dessen.
export default function MissionSynopsisEditor({
  missionId,
  bodyHtml,
  sourceMarkdown,
}: {
  missionId: number;
  bodyHtml: string | null;
  sourceMarkdown: string;
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
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="lcars-link-text text-[13px] self-end"
        >
          Synopsis bearbeiten
        </button>

        {displayHtml ? (
          <div
            className="mission-body lcars-text"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ) : (
          <p className="lcars-empty-state">Keine Zusammenfassung vorhanden</p>
        )}

        {state.warning && (
          <p className="text-lcars-amber text-[13px]" role="alert">
            {state.warning}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="missionId" value={missionId} />
      <textarea
        name="bodyMarkdown"
        required
        defaultValue={sourceMarkdown}
        className="rounded-lcars-pill lcars-input min-h-[300px] resize-y font-mono"
      />
      <div className="flex gap-[12px] items-center justify-end">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="lcars-link-text text-[13px]"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={pending}
          className="lcars-switch text-[13px] disabled:opacity-50"
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
  );
}
