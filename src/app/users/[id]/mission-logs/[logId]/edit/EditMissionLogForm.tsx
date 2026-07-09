"use client";
import { useActionState } from "react";
import { updateMissionLogAction, type EditMissionLogState } from "./actions";
import type { OwnMissionLogForEdit } from "@/lib/missions";
import { SubmitButton, FormError } from "../../../../_shared/FormPrimitives";
import {
  MissionLogTitleField,
  MissionLogDateBodyFields,
} from "../../_shared/MissionLogFields";

const initialState: EditMissionLogState = {};

export default function EditMissionLogForm({
  userId,
  log,
  isAdminOrGM,
}: {
  userId: number;
  log: OwnMissionLogForEdit;
  isAdminOrGM: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateMissionLogAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="logId" value={log.id} />

      <MissionLogTitleField idPrefix="edit-log" defaultValue={log.title} />

      <MissionLogDateBodyFields
        idPrefix="edit-log"
        defaults={{ logDate: log.logDate, bodyMarkdown: log.sourceMarkdown }}
        isAdminOrGM={isAdminOrGM}
      />

      <SubmitButton
        pending={pending}
        pendingLabel="Wird gespeichert…"
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Änderungen speichern
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}
