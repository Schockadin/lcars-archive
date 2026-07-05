"use client";
import { useActionState } from "react";
import { updateCharacterAction, type CharacterFormState } from "./actions";
import type { OwnCharacterForEdit } from "@/lib/characters";
import { SubmitButton, FormError } from "../../../../_shared/FormPrimitives";
import { CharacterFields } from "../../_shared/CharacterFields";

const initialState: CharacterFormState = {};

export default function EditCharacterForm({
  userId,
  character,
  isAdminOrGM,
}: {
  userId: number;
  character: OwnCharacterForEdit;
  isAdminOrGM: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateCharacterAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="characterId" value={character.id} />

      <CharacterFields
        idPrefix="edit-character"
        defaults={{
          name: character.name,
          status: character.status,
          portrait: character.portrait ?? undefined,
          rank: character.rank ?? undefined,
          species: character.species.join(", "),
          homeworld: character.homeworld ?? undefined,
          aliases: character.aliases.join(", "),
          bodyMarkdown: character.sourceMarkdown,
        }}
        isAdminOrGM={isAdminOrGM}
      />

      <SubmitButton
        pending={pending}
        pendingLabel="Wird gespeichert…"
        className="lcars-switch self-start disabled:opacity-50"
      >
        Änderungen speichern
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}
