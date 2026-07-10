"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  missionLogAction,
  type MissionLogFormState,
} from "../../_shared/contentAction";
import { missionLogHeadFields } from "../../_shared/missionLogHeadFields";
import type { OwnMissionLogForEdit } from "@/lib/missions";
import { MarkdownFormatHint } from "../../../../_shared/MarkdownHint";

const initialState: MissionLogFormState = {};

export default function EditMissionLogForm({
  userId,
  log,
  isAdminOrGM,
}: {
  userId: number;
  log: OwnMissionLogForEdit;
  isAdminOrGM: boolean;
}) {
  return (
    <ContentEditor
      mode="edit"
      action={missionLogAction}
      initialState={initialState}
      hiddenFields={{ userId, logId: log.id }}
      headFields={missionLogHeadFields}
      defaults={{ title: log.title, logDate: log.logDate ?? undefined }}
      idPrefix="edit-log"
      bodyLabel="Log-Text"
      bodyHint={<MarkdownFormatHint />}
      bodyDefaultValue={log.sourceMarkdown}
      bodyRequired
      bodyLarge
      isAdminOrGM={isAdminOrGM}
      submitLabel="Änderungen speichern"
      submitPendingLabel="Wird gespeichert…"
    />
  );
}
