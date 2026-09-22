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
}: {
  userId: number;
  entry: OwnArchiveEntryForEdit;
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
        aliases: entry.aliases.join(", "),
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
      draftScope={`archive-entry:${entry.id}`}
      bodyLabel="Inhalt"
      bodyHint={<MarkdownFormatHint />}
      bodyDefaultValue={entry.sourceMarkdown}
      bodyRequired
      bodyLarge
      draftDefaultValue={entry.isDraft}
      insertImage={{ contentType: "archive_entry", contentId: entry.id }}
      submitLabel="Änderungen speichern"
      submitPendingLabel="Wird gespeichert…"
    />
  );
}
