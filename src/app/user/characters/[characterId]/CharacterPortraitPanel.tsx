"use client";

import { useActionState } from "react";
import {
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import PortraitPicker from "../_shared/PortraitPicker";
import {
  updateCharacterPortraitAction,
  type CharacterPanelState,
} from "../_shared/panelActions";
import { parsePortraitCrop } from "@/lib/portraitCrop";
import type { OwnCharacterForEdit } from "@/lib/characters";
import CharacterPanel from "./CharacterPanel";

const initialState: CharacterPanelState = {};

// Das Profilbild ist absichtlich von der Personalakte getrennt: Bilddatei
// und Ausschnitt haben ihren eigenen Speicherweg und können dadurch keine
// gleichzeitig geänderten Stammdaten überschreiben.
export default function CharacterPortraitPanel({
  userId,
  character,
}: {
  userId: number;
  character: OwnCharacterForEdit;
}) {
  const [state, formAction, pending] = useActionState(
    updateCharacterPortraitAction,
    initialState,
  );

  return (
    <CharacterPanel en="Portrait" de="Profilbild">
      <form
        action={formAction}
        className="stat-editor-body flex flex-col gap-[12px]"
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="characterId" value={character.id} />
        <PortraitPicker
          idPrefix="portrait-panel"
          defaultUrl={character.portrait ?? ""}
          defaultSource={character.portraitSource ?? ""}
          defaultCrop={parsePortraitCrop(character.portraitCrop)}
        />
        <SubmitButton
          pending={pending}
          pendingLabel="Wird gespeichert…"
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Profilbild speichern
        </SubmitButton>
        <FormError message={state?.error} />
        {state?.success && <FormSuccess>{state.success}</FormSuccess>}
      </form>
    </CharacterPanel>
  );
}
