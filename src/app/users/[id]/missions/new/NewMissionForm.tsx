"use client";
import { useActionState } from "react";
import { createMissionAction, type MissionFormState } from "./actions";
import { SubmitButton, FormError } from "../../../_shared/FormPrimitives";
import { MissionFields } from "../_shared/MissionFields";

const initialState: MissionFormState = {};

export default function NewMissionForm({
  userId,
  defaultStartedAt,
}: {
  userId: number;
  defaultStartedAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createMissionAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />

      <MissionFields
        idPrefix="mission"
        defaults={{ startedAt: defaultStartedAt }}
        showSlugField
      />

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
