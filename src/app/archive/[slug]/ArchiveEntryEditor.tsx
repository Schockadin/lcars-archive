"use client";
import { useActionState, useState } from "react";
import {
  updateOwnArchiveEntryAction,
  type ArchiveEntryEditState,
} from "@/app/actions/archive";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import { CheckIcon, XIcon } from "@/lib/icons";

const initialState: ArchiveEntryEditState = {};

// Inline-Editor für den Inhalt eines Archiv-Eintrags, nur für den Owner
// gerendert (siehe archive/[slug]/page.tsx) — anders als
// MissionSynopsisEditor.tsx (gm/admin-gated), hier owner-gated: jeder User
// darf so seine EIGENEN Archiv-Einträge bearbeiten. Titel/Kategorie/Tags
// bleiben unangetastet (dafür das volle Formular unter
// /user/archive/[entryId]/edit). Zeigt standardmäßig den gerenderten
// Inhalt; im Editiermodus ein Markdown-Textfeld statt dessen.
export default function ArchiveEntryEditor({
  entryId,
  contentHtml,
  sourceMarkdown,
  isAdminOrGM,
  editMode,
  onEditModeChange,
}: {
  entryId: number;
  contentHtml: string;
  sourceMarkdown: string;
  // Der Editor selbst ist owner-gated (jeder Owner darf ihn öffnen), der
  // Timeline-Marker-Button darin aber zusätzlich rollen-gated — anders als
  // MissionSynopsisEditor.tsx, wo Owner- und Rollen-Gate zusammenfallen.
  isAdminOrGM: boolean;
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
}) {
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
    if (state.success) onEditModeChange(false);
  }

  const displayHtml = state.updatedHtml ?? contentHtml;

  if (!editMode) {
    return (
      <div className="flex flex-col gap-[8px]">
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

      <MarkdownEditor
        id={textareaId}
        required
        defaultValue={sourceMarkdown}
        isAdminOrGM={isAdminOrGM}
      />

      <AutoLinkCheckbox idPrefix={textareaId} />

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
        <p className="text-lcars-red text-[13px]" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
