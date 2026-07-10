"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  characterAction,
  type CharacterFormState,
} from "../_shared/contentAction";
import { characterHeadFields } from "../_shared/characterHeadFields";
import { MarkdownFormatHint } from "../../../_shared/MarkdownHint";

const initialState: CharacterFormState = {};

export default function NewCharacterForm({
  userId,
  isAdminOrGM,
}: {
  userId: number;
  isAdminOrGM: boolean;
}) {
  return (
    <ContentEditor
      mode="create"
      action={characterAction}
      initialState={initialState}
      hiddenFields={{ userId }}
      headFields={characterHeadFields}
      defaults={{ status: "active" }}
      idPrefix="character"
      bodyLabel="Biografie (optional)"
      bodyHint={<MarkdownFormatHint />}
      isAdminOrGM={isAdminOrGM}
      submitLabel="Speichern"
      submitPendingLabel="Speichern…"
    />
  );
}
