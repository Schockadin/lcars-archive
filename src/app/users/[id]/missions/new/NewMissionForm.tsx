"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import { missionAction, type MissionFormState } from "../_shared/contentAction";
import {
  missionHeadFields,
  missionMetadataFields,
} from "../_shared/missionHeadFields";
import { MarkdownFormatHint } from "../../../_shared/MarkdownHint";

const initialState: MissionFormState = {};

export default function NewMissionForm({
  userId,
  defaultStartedAt,
}: {
  userId: number;
  defaultStartedAt: string | null;
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
      bodyLabel="Zusammenfassung"
      bodyHint={<MarkdownFormatHint />}
      bodyRequired
      bodyLarge
      isAdminOrGM
      submitLabel="Speichern"
      submitPendingLabel="Speichern…"
    />
  );
}
