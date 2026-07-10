"use client";
import { useActionState } from "react";
import { deleteMissionAction, type EditMissionState } from "./actions";
import { missionAction } from "../../_shared/contentAction";
import type { MissionDetail } from "@/types/missions";
import { FormError } from "../../../../_shared/FormPrimitives";
import { DangerZoneButton } from "../../../../_shared/DangerZoneButton";
import {
  missionHeadFields,
  missionMetadataFields,
} from "../../_shared/missionHeadFields";
import MissionParticipantsField from "../../_shared/MissionParticipantsField";
import { MarkdownFormatHint } from "../../../../_shared/MarkdownHint";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import type { CharacterParticipantOption } from "@/lib/characters";

const initialState: EditMissionState = {};

export default function EditMissionForm({
  userId,
  mission,
  characters,
  participantIds,
}: {
  userId: number;
  mission: MissionDetail;
  characters: CharacterParticipantOption[];
  participantIds: number[];
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteMissionAction,
    initialState,
  );

  return (
    <>
      <ContentEditor
        mode="edit"
        action={missionAction}
        initialState={initialState}
        hiddenFields={{ userId, missionId: mission.id }}
        headFields={missionHeadFields}
        metadataFields={missionMetadataFields}
        defaults={{
          title: mission.title,
          status: mission.status,
          startedAt: mission.started_at ?? undefined,
          endedAt: mission.ended_at ?? undefined,
          tags: mission.metadata.tags.join(", "),
          teaser: mission.metadata.teaser ?? undefined,
        }}
        idPrefix="edit-mission"
        bodyLabel="Zusammenfassung"
        bodyHint={<MarkdownFormatHint />}
        bodyDefaultValue={mission.sourceMarkdown ?? ""}
        bodyRequired
        bodyLarge
        isAdminOrGM
        extraHeadSlot={
          <MissionParticipantsField
            idPrefix="edit-mission"
            characters={characters}
            defaultSelectedIds={participantIds}
          />
        }
        submitLabel="Änderungen speichern"
        submitPendingLabel="Wird gespeichert…"
      />

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
