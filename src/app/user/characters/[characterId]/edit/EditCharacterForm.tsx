"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  characterAction,
  type CharacterFormState,
} from "../../_shared/contentAction";
import {
  characterHeadFields,
  characterMetadataFields,
} from "../../_shared/characterHeadFields";
import type { OwnCharacterForEdit } from "@/lib/characters";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";

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
      metadataFields={characterMetadataFields}
      defaults={{
        name: character.name,
        status: character.status,
        portrait: character.portrait ?? undefined,
        rank: character.rank ?? undefined,
        species: character.species.join(", "),
        homeworld: character.homeworld ?? undefined,
        aliases: character.aliases.join(", "),
        age: character.age ?? undefined,
        dateOfBirth: character.dateOfBirth ?? undefined,
        generation: character.generation.join(", "),
        factions: character.factions.join(", "),
        ships: character.ships.join(", "),
        division: character.division ?? undefined,
        tags: character.tags.join(", "),
      }}
      idPrefix="edit-character"
      bodyLabel="Biografie (optional)"
      bodyHint={<MarkdownFormatHint />}
      bodyDefaultValue={character.sourceMarkdown}
      isAdminOrGM={isAdminOrGM}
      draftDefaultValue={character.isDraft}
      submitLabel="Änderungen speichern"
      submitPendingLabel="Wird gespeichert…"
    />
  );
}
