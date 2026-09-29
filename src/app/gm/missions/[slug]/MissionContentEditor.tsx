"use client";
import { useActionState } from "react";
import { missionAction } from "@/app/user/missions/_shared/contentAction";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import type { MissionDetail } from "@/types/missions";
import type { CharacterParticipantOption } from "@/lib/characters";
import { missionHeadFields, missionMetadataFields } from "@/app/user/missions/_shared/missionHeadFields";
import MissionParticipantsField from "@/app/user/missions/_shared/MissionParticipantsField";
import { DangerZoneButton } from "@/app/_shared/DangerZoneButton";
import { FormError } from "@/app/_shared/FormPrimitives";
import { deleteGmMissionAction, type EditMissionState } from "./actions";

const initialState: EditMissionState = {};

export default function MissionContentEditor({ mission, userId, characters, participantIds }: {
  mission: MissionDetail;
  userId: number;
  characters: CharacterParticipantOption[];
  participantIds: number[];
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteGmMissionAction, initialState);
  return <>
    <ContentEditor mode="edit" action={missionAction} initialState={initialState}
      hiddenFields={{ userId, missionId: mission.id }} headFields={missionHeadFields}
      metadataFields={missionMetadataFields}
      defaults={{ title: mission.title, status: mission.status, startedAt: mission.started_at ?? undefined, endedAt: mission.ended_at ?? undefined, tags: mission.metadata.tags.join(", "), teaser: mission.metadata.teaser ?? undefined }}
      idPrefix="edit-mission" draftScope={`mission:${mission.id}`} bodyLabel="Zusammenfassung" bodyHidden
      bodyHiddenMessage={<p className="lcars-empty-state">Die Missionszusammenfassung entsteht automatisch aus den Zusammenfassungsblöcken eingetragener Sessions.</p>}
      draftDefaultValue={mission.isDraft}
      extraHeadSlot={<MissionParticipantsField idPrefix="edit-mission" characters={characters} defaultSelectedIds={participantIds} />}
      submitLabel="Änderungen speichern" submitPendingLabel="Wird gespeichert…" />
    <section className="mt-[32px] flex flex-col gap-[12px]"><h2 className="text-lcars-quinary-ink">Gefahrenzone</h2>
      <DangerZoneButton formAction={deleteAction} hiddenFields={{ missionId: mission.id }} pending={deletePending}
        confirmMessage={`Mission „${mission.title}“ wirklich endgültig löschen? Alle zugehörigen Mission-Logs werden mit gelöscht — das lässt sich nicht rückgängig machen.`}
        label="Mission löschen" pendingLabel="Wird gelöscht…" />
      <FormError message={deleteState.error} />
    </section>
  </>;
}
