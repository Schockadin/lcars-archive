"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  characterAction,
  type CharacterFormState,
} from "../../_shared/contentAction";
import { characterHeadFields } from "../../_shared/characterHeadFields";
import type { OwnCharacterForEdit } from "@/lib/characters";
import { MarkdownFormatHint } from "../../../../_shared/MarkdownHint";

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
  return (
    <ContentEditor
      mode="edit"
      action={characterAction}
      initialState={initialState}
      hiddenFields={{ userId, characterId: character.id }}
      headFields={characterHeadFields}
      defaults={{
        name: character.name,
        status: character.status,
        portrait: character.portrait ?? undefined,
        rank: character.rank ?? undefined,
        species: character.species.join(", "),
        homeworld: character.homeworld ?? undefined,
        aliases: character.aliases.join(", "),
      }}
      idPrefix="edit-character"
      bodyLabel="Biografie (optional)"
      bodyHint={<MarkdownFormatHint />}
      bodyDefaultValue={character.sourceMarkdown}
      isAdminOrGM={isAdminOrGM}
      submitLabel="Änderungen speichern"
      submitPendingLabel="Wird gespeichert…"
    />
  );
}
