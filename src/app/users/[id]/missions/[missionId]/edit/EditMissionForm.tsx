"use client";
import { useActionState } from "react";
import {
  updateMissionAction,
  deleteMissionAction,
  type EditMissionState,
} from "./actions";
import type { MissionDetail } from "@/types/missions";
import { SubmitButton, FormError } from "../../../../_shared/FormPrimitives";
import { DangerZoneButton } from "../../../../_shared/DangerZoneButton";
import { MissionFields } from "../../_shared/MissionFields";

const initialState: EditMissionState = {};

export default function EditMissionForm({
  mission,
}: {
  mission: MissionDetail;
}) {
  const [state, formAction, pending] = useActionState(
    updateMissionAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteMissionAction,
    initialState,
  );

  return (
    <>
      <form action={formAction} className="flex flex-col gap-[16px]">
        <input type="hidden" name="missionId" value={mission.id} />

        <MissionFields
          idPrefix="edit-mission"
          defaults={{
            title: mission.title,
            status: mission.status,
            startedAt: mission.started_at,
            endedAt: mission.ended_at,
            tags: mission.metadata.tags.join(", "),
            bodyMarkdown: mission.sourceMarkdown ?? "",
          }}
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

      <section className="flex flex-col gap-[12px] mt-[32px]">
        <h2 className="text-lcars-red">Gefahrenzone</h2>
        <DangerZoneButton
          formAction={deleteAction}
          hiddenFields={{ missionId: mission.id }}
          pending={deletePending}
          confirmMessage={`Mission "${mission.title}" wirklich endgültig löschen? Alle zugehörigen Mission-Logs werden mit gelöscht — das lässt sich nicht rückgängig machen.`}
          label="Mission löschen"
          pendingLabel="Wird gelöscht…"
        />
        <FormError message={deleteState?.error} />
      </section>
    </>
  );
}
