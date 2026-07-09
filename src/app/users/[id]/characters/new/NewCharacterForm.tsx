"use client";
import { useActionState } from "react";
import { createCharacterAction, type CharacterFormState } from "./actions";
import { SubmitButton, FormError } from "../../../_shared/FormPrimitives";
import { CharacterFields } from "../_shared/CharacterFields";

const initialState: CharacterFormState = {};

export default function NewCharacterForm({
  userId,
  isAdminOrGM,
}: {
  userId: number;
  isAdminOrGM: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createCharacterAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />

      <CharacterFields idPrefix="character" isAdminOrGM={isAdminOrGM} />

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-start disabled:opacity-50 w-[100%]"
      >
        Speichern
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}
