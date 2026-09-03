"use client";
import { useActionState, useState } from "react";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import { SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import CharacterPanel from "./CharacterPanel";
import {
  updateCharacterBioAction,
  type CharacterPanelState,
} from "../_shared/panelActions";

const initialState: CharacterPanelState = {};

// Panel „Biografie": gerendertes HTML zum Lesen, per Stift-Knopf derselbe
// Markdown-Editor wie in den übrigen Formularen. Gespeichert wird nur die
// Biografie (siehe panelActions.ts) — Stammdaten und Werte bleiben unberührt.
export default function CharacterBioPanel({
  userId,
  characterId,
  isAdminOrGM,
  bioHtml,
  sourceMarkdown,
}: {
  userId: number;
  characterId: number;
  isAdminOrGM: boolean;
  // Bereits gerendertes, bereinigtes HTML aus der Akte.
  bioHtml: string | null;
  sourceMarkdown: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateCharacterBioAction,
    initialState,
  );

  // Siehe CharacterHeadPanel: auf ein NEUES Action-Ergebnis reagieren, nicht
  // auf ein altes, das noch im State steht.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) setEditing(false);
  }

  return (
    <CharacterPanel
      en="Biography"
      de="Biografie"
      editing={editing}
      onToggleEdit={() => setEditing((v) => !v)}
      editLabel="Biografie bearbeiten"
    >
      <div className="stat-editor-body">
        {!editing ? (
          bioHtml ? (
            // Das HTML kommt aus der Markdown-Pipeline und ist dort bereits
            // bereinigt (rehype-sanitize) — dieselbe Quelle wie die
            // öffentliche Charakterseite.
            <div
              className="mission-body lcars-text"
              dangerouslySetInnerHTML={{ __html: bioHtml }}
            />
          ) : (
            <p className="lcars-empty-state">
              Noch keine Biografie geschrieben.
            </p>
          )
        ) : (
          <form action={formAction} className="flex flex-col gap-[12px]">
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="characterId" value={characterId} />

            <MarkdownEditor
              id="bio-panel-body"
              defaultValue={sourceMarkdown}
              isAdminOrGM={isAdminOrGM}
              large
            />
            <p className="lcars-text text-[14px]">
              <MarkdownFormatHint />
            </p>
            <AutoLinkCheckbox idPrefix="bio-panel" />

            <SubmitButton
              pending={pending}
              pendingLabel="Wird gespeichert…"
              className="lcars-pill-btn--outline self-start disabled:opacity-50"
            >
              Biografie speichern
            </SubmitButton>
          </form>
        )}

        <FormError message={state?.error} />
      </div>
    </CharacterPanel>
  );
}
