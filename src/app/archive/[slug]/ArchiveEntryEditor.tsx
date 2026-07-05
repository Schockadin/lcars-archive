"use client";
import { useActionState, useState } from "react";
import {
  updateOwnArchiveEntryAction,
  type ArchiveEntryEditState,
} from "@/app/actions/archive";
import TimelineMarkerButton from "@/app/users/_shared/TimelineMarkerButton";
import AutoLinkCheckbox from "@/app/users/_shared/AutoLinkCheckbox";

const initialState: ArchiveEntryEditState = {};

// Inline-Editor für den Inhalt eines Archiv-Eintrags, nur für den Owner
// gerendert (siehe archive/[slug]/page.tsx) — anders als
// MissionSynopsisEditor.tsx (gm/admin-gated), hier owner-gated: jeder User
// darf so seine EIGENEN Archiv-Einträge bearbeiten. Titel/Kategorie/Tags
// bleiben unangetastet (dafür das volle Formular unter
// /users/[id]/archive/[entryId]/edit). Zeigt standardmäßig den gerenderten
// Inhalt; im Editiermodus ein Markdown-Textfeld statt dessen.
export default function ArchiveEntryEditor({
  entryId,
  contentHtml,
  sourceMarkdown,
  isAdminOrGM,
}: {
  entryId: number;
  contentHtml: string;
  sourceMarkdown: string;
  // Der Editor selbst ist owner-gated (jeder Owner darf ihn öffnen), der
  // Timeline-Marker-Button darin aber zusätzlich rollen-gated — anders als
  // MissionSynopsisEditor.tsx, wo Owner- und Rollen-Gate zusammenfallen.
  isAdminOrGM: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateOwnArchiveEntryAction,
    initialState,
  );

  // Gleiches Muster wie MissionSynopsisEditor.tsx: Referenzvergleich statt
  // simplem state.success-Wert, damit jeder abgeschlossene Speichervorgang
  // erkannt wird (useActionState liefert bei jedem Dispatch ein neues
  // state-Objekt). Direkt im Render-Body angepasst statt in einem Effect.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setEditing(false);
  }

  const displayHtml = state.updatedHtml ?? contentHtml;

  if (!editing) {
    return (
      <div className="flex flex-col gap-[8px]">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="lcars-switch self-start"
        >
          Inhalt bearbeiten
        </button>

        {displayHtml ? (
          <div
            className="mission-body lcars-text"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ) : (
          <p className="lcars-empty-state">
            Kein Inhalt zu diesem Eintrag hinterlegt.
          </p>
        )}
      </div>
    );
  }

  const textareaId = `archive-entry-editor-${entryId}`;

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="entryId" value={entryId} />

      {isAdminOrGM && <TimelineMarkerButton textareaId={textareaId} />}

      <textarea
        id={textareaId}
        name="bodyMarkdown"
        required
        defaultValue={sourceMarkdown}
        className="rounded-lcars-pill lcars-input min-h-[300px] resize-y font-mono"
      />

      <AutoLinkCheckbox idPrefix={textareaId} />

      <div className="flex gap-[12px] items-center justify-end">
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
  );
}
