"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  archiveEntryAction,
  type ArchiveEntryFormState,
} from "../../_shared/contentAction";
import { archiveEntryHeadFields } from "../../_shared/archiveEntryHeadFields";
import ArchiveMetadataSlot from "../../_shared/ArchiveMetadataSlot";
import type { OwnArchiveEntryForEdit } from "@/lib/archive";
import type { ArchiveCategory } from "@/types/archive";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";

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
      metadataSlot={
        <ArchiveMetadataSlot
          idPrefix="edit-archive-entry"
          categorySelectId="edit-archive-entry-category"
          initialCategory={entry.category as Exclude<ArchiveCategory, "dialogue">}
          summaryDefault={entry.summary ?? undefined}
          attributeDefaults={entry.attributeValues}
          referenceDefaults={entry.referenceValues}
        />
      }
      idPrefix="edit-archive-entry"
      bodyLabel="Inhalt"
      bodyHint={<MarkdownFormatHint />}
      bodyDefaultValue={entry.sourceMarkdown}
      bodyRequired
      bodyLarge
      isAdminOrGM={isAdminOrGM}
      insertImage={{ contentType: "archive_entry", contentId: entry.id }}
      submitLabel="Änderungen speichern"
      submitPendingLabel="Wird gespeichert…"
    />
  );
}
