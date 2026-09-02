"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  archiveEntryAction,
  type ArchiveEntryFormState,
} from "../_shared/contentAction";
import { archiveEntryHeadFields } from "../_shared/archiveEntryHeadFields";
import ArchiveMetadataSlot from "../_shared/ArchiveMetadataSlot";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import type { ArchiveCategory } from "@/types/archive";

const initialState: ArchiveEntryFormState = {};

export default function NewArchiveEntryForm({
  userId,
  isAdminOrGM,
  // Vorgewählte Kategorie (siehe page.tsx) — änderbar wie jede andere.
  initialCategory = "other",
}: {
  userId: number;
  isAdminOrGM: boolean;
  initialCategory?: Exclude<ArchiveCategory, "dialogue">;
}) {
  return (
    <ContentEditor
      mode="create"
      action={archiveEntryAction}
      initialState={initialState}
      hiddenFields={{ userId }}
      headFields={archiveEntryHeadFields}
      defaults={{ category: initialCategory }}
      metadataSlot={
        <ArchiveMetadataSlot
          idPrefix="archive-entry"
          categorySelectId="archive-entry-category"
          initialCategory={initialCategory}
        />
      }
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
