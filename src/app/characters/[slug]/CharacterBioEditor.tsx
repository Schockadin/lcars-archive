"use client";
import { useActionState, useState } from "react";
import {
  updateOwnCharacterBioAction,
  type CharacterBioEditState,
} from "@/app/actions/characters";
import TimelineMarkerButton from "@/app/users/_shared/TimelineMarkerButton";
import AutoLinkCheckbox from "@/app/users/_shared/AutoLinkCheckbox";

const initialState: CharacterBioEditState = {};

// Inline-Editor für die Charakter-Biografie, nur für den Owner (player_id)
// gerendert (siehe CharacterHero.tsx) — analog ArchiveEntryEditor.tsx
// (owner-gated), nicht MissionSynopsisEditor.tsx (gm/admin-gated): der
// Owner einer Charakterakte ist player_id, kein gm/admin-Konzept. Zeigt
// standardmäßig die gerenderte Bio; im Editiermodus ein Markdown-Textfeld
// statt dessen. Anders als beim Archiv-Eintrag darf die Bio leer sein (ein
// Charakter ohne Bio ist ein normaler Zustand).
export default function CharacterBioEditor({
  characterId,
  bioHtml,
  sourceMarkdown,
  isAdminOrGM,
}: {
  characterId: number;
  bioHtml: string | null;
  sourceMarkdown: string;
  // Der Editor selbst ist owner-gated (siehe CharacterHero.tsx), der
  // Timeline-Marker-Button darin aber zusätzlich rollen-gated — derselbe
  // Owner könnte selbst gm/admin sein oder auch nicht.
  isAdminOrGM: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateOwnCharacterBioAction,
    initialState,
  );

  // Gleiches Muster wie ArchiveEntryEditor.tsx: Referenzvergleich statt
  // simplem state.success-Wert, damit jeder abgeschlossene Speichervorgang
  // erkannt wird (useActionState liefert bei jedem Dispatch ein neues
  // state-Objekt). Direkt im Render-Body angepasst statt in einem Effect.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setEditing(false);
  }

  const displayHtml =
    state.updatedBio !== undefined ? state.updatedBio : bioHtml;

  if (!editing) {
    return (
      <div className="flex flex-col gap-[8px]">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="lcars-switch self-start"
        >
          Biografie bearbeiten
        </button>

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

      {isAdminOrGM && <TimelineMarkerButton textareaId={textareaId} />}

      <textarea
        id={textareaId}
        name="bodyMarkdown"
        defaultValue={sourceMarkdown}
        className="rounded-lcars-pill lcars-input min-h-[300px] resize-y font-mono"
      />

      <AutoLinkCheckbox idPrefix={textareaId} />

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
  );
}
