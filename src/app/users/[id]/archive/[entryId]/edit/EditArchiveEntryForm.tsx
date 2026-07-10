"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  archiveEntryAction,
  type ArchiveEntryFormState,
} from "../../_shared/contentAction";
import { archiveEntryHeadFields } from "../../_shared/archiveEntryHeadFields";
import type { OwnArchiveEntryForEdit } from "@/lib/archive";
import { MarkdownFormatHint } from "../../../../_shared/MarkdownHint";

const initialState: ArchiveEntryFormState = {};

export default function EditArchiveEntryForm({
  userId,
  entry,
  isAdminOrGM,
}: {
  userId: number;
  entry: OwnArchiveEntryForEdit;
  isAdminOrGM: boolean;
}) {
  return (
    <ContentEditor
      mode="edit"
      action={archiveEntryAction}
      initialState={initialState}
      hiddenFields={{ userId, entryId: entry.id }}
      headFields={archiveEntryHeadFields}
      defaults={{
        title: entry.title,
        category: entry.category,
        tags: entry.tags.join(", "),
      }}
      idPrefix="edit-archive-entry"
      bodyLabel="Inhalt"
      bodyHint={<MarkdownFormatHint />}
      bodyDefaultValue={entry.sourceMarkdown}
      bodyRequired
      bodyLarge
      isAdminOrGM={isAdminOrGM}
      submitLabel="Änderungen speichern"
      submitPendingLabel="Wird gespeichert…"
    />
  );
}
