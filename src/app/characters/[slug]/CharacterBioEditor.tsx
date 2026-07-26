"use client";
import { useActionState, useState } from "react";
import {
  updateOwnCharacterBioAction,
  type CharacterBioEditState,
} from "@/app/actions/characters";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import { Character } from "@/types/character";
import { CheckIcon, XIcon } from "@/lib/icons";

const initialState: CharacterBioEditState = {};

// Inline-Editor für die Charakter-Biografie, nur für den Owner (player_id)
// gerendert (siehe CharacterHero.tsx) — analog ArchiveEntryEditor.tsx
// (owner-gated), nicht MissionSynopsisEditor.tsx (gm/admin-gated): der
// Owner einer Charakterakte ist player_id, kein gm/admin-Konzept. Zeigt
// standardmäßig die gerenderte Bio; im Editiermodus ein Markdown-Textfeld
// statt dessen. Anders als beim Archiv-Eintrag darf die Bio leer sein (ein
// Charakter ohne Bio ist ein normaler Zustand).
export default function CharacterBioEditor({
  bioHtml,
  sourceMarkdown,
  isAdminOrGM = false,
  character,
  editMode,
  onEditModeChange,
}: {
  bioHtml: string | null;
  sourceMarkdown: string;
  // Der Editor selbst ist owner-gated (siehe CharacterHero.tsx), die
  // erweiterten Editor-Werkzeuge (Timeline-Marker/Autolinking) darin aber
  // zusätzlich rechte-gated (content.autolink_tools) — derselbe Owner könnte
  // sie haben oder nicht.
  isAdminOrGM?: boolean;
  character: Character;
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateOwnCharacterBioAction,
    initialState,
  );

  const characterId = character.id;

  // Gleiches Muster wie ArchiveEntryEditor.tsx: Referenzvergleich statt
  // simplem state.success-Wert, damit jeder abgeschlossene Speichervorgang
  // erkannt wird (useActionState liefert bei jedem Dispatch ein neues
  // state-Objekt). Direkt im Render-Body angepasst statt in einem Effect.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) onEditModeChange(false);
  }

  const displayHtml =
    state.updatedBio !== undefined ? state.updatedBio : bioHtml;

  if (!editMode) {
    return (
      <div className="flex flex-col gap-[8px]">
        {displayHtml ? (
          <div
            className="char-file-bio lcars-text"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ) : (
          <p className="lcars-empty-state">
            Keine biografischen Daten im Archiv hinterlegt.
          </p>
        )}
      </div>
    );
  }

  const textareaId = `character-bio-${characterId}`;

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="characterId" value={characterId} />

      <MarkdownEditor
        id={textareaId}
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
