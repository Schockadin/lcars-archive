"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  archiveEntryAction,
  type ArchiveEntryFormState,
} from "../_shared/contentAction";
import { archiveEntryHeadFields } from "../_shared/archiveEntryHeadFields";
import { MarkdownFormatHint } from "../../../_shared/MarkdownHint";

const initialState: ArchiveEntryFormState = {};

export default function NewArchiveEntryForm({
  userId,
  isAdminOrGM,
}: {
  userId: number;
  isAdminOrGM: boolean;
}) {
  return (
    <ContentEditor
      mode="create"
      action={archiveEntryAction}
      initialState={initialState}
      hiddenFields={{ userId }}
      headFields={archiveEntryHeadFields}
      defaults={{ category: "other" }}
      idPrefix="archive-entry"
      bodyLabel="Inhalt"
      bodyHint={<MarkdownFormatHint />}
      bodyRequired
      bodyLarge
      isAdminOrGM={isAdminOrGM}
      submitLabel="Speichern"
      submitPendingLabel="Speichern…"
    />
  );
}
