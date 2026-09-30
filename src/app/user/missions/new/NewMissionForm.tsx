"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import { missionAction, type MissionFormState } from "../_shared/contentAction";
import {
  missionHeadFields,
  missionMetadataFields,
} from "../_shared/missionHeadFields";
import MissionParticipantsField from "../_shared/MissionParticipantsField";
import type { CharacterParticipantOption } from "@/lib/characters";

const initialState: MissionFormState = {};

export default function NewMissionForm({
  userId,
  defaultStartedAt,
  characters,
}: {
  userId: number;
  defaultStartedAt: string | null;
  characters: CharacterParticipantOption[];
}) {
  return (
    <ContentEditor
      mode="create"
      action={missionAction}
      initialState={initialState}
      hiddenFields={{ userId }}
      headFields={missionHeadFields}
      metadataFields={missionMetadataFields}
      defaults={{ status: "active", startedAt: defaultStartedAt ?? undefined }}
      idPrefix="mission"
      draftScope="mission:new"
      bodyLabel="Zusammenfassung"
      bodyHidden
      bodyHiddenMessage={<p className="lcars-empty-state">Die Missionszusammenfassung entsteht automatisch aus den Zusammenfassungsblöcken eingetragener Sessions.</p>}
      submitLabel="Speichern"
      submitPendingLabel="Speichern…"
      extraHeadSlot={
        <MissionParticipantsField idPrefix="mission" characters={characters} />
      }
    />
  );
}
