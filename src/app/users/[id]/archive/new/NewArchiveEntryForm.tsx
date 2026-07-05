"use client";
import { useActionState } from "react";
import {
  createArchiveEntryAction,
  type ArchiveEntryFormState,
} from "./actions";
import { SubmitButton, FormError } from "../../../_shared/FormPrimitives";
import { ArchiveEntryFields } from "../_shared/ArchiveEntryFields";

const initialState: ArchiveEntryFormState = {};

export default function NewArchiveEntryForm({ userId }: { userId: number }) {
  const [state, formAction, pending] = useActionState(
    createArchiveEntryAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />

      <ArchiveEntryFields idPrefix="archive-entry" />

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-switch self-start disabled:opacity-50 w-[100%]"
      >
        Speichern
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}
