"use client";
import { useActionState } from "react";
import {
  updateArchiveEntryAction,
  type ArchiveEntryFormState,
} from "./actions";
import type { OwnArchiveEntryForEdit } from "@/lib/archive";
import { SubmitButton, FormError } from "../../../../_shared/FormPrimitives";
import { ArchiveEntryFields } from "../../_shared/ArchiveEntryFields";

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
  const [state, formAction, pending] = useActionState(
    updateArchiveEntryAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="entryId" value={entry.id} />

      <ArchiveEntryFields
        idPrefix="edit-archive-entry"
        defaults={{
          title: entry.title,
          category: entry.category,
          tags: entry.tags.join(", "),
          bodyMarkdown: entry.sourceMarkdown,
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
