"use client";
import ContentEditor from "@/components/ContentEditor/ContentEditor";
import {
  missionLogAction,
  type MissionLogFormState,
} from "../_shared/contentAction";
import { missionLogHeadFields } from "../_shared/missionLogHeadFields";
import { FormField } from "../../../_shared/FormPrimitives";
import { MarkdownFormatHint } from "../../../_shared/MarkdownHint";

const missionLogInputClass = "rounded-lcars-pill lcars-input w-full sm:w-[400px]";

const initialState: MissionLogFormState = {};

export default function NewMissionLogForm({
  userId,
  ownCharacters,
  missions,
  defaultSessionNr,
  defaultLogDate,
  isAdminOrGM,
}: {
  userId: number;
  ownCharacters: { id: number; slug: string; name: string }[];
  missions: { slug: string; title: string }[];
  defaultSessionNr: number;
  defaultLogDate: string | null;
  isAdminOrGM: boolean;
}) {
  return (
    <ContentEditor
      mode="create"
      action={missionLogAction}
      initialState={initialState}
      hiddenFields={{ userId }}
      headFields={missionLogHeadFields}
      defaults={{ sessionNr: defaultSessionNr, logDate: defaultLogDate ?? undefined }}
      idPrefix="log"
      bodyLabel="Log-Text"
      bodyHint={<MarkdownFormatHint />}
      bodyRequired
      bodyLarge
      isAdminOrGM={isAdminOrGM}
      submitLabel="Speichern"
      submitPendingLabel="Speichern…"
      extraHeadSlot={
        <>
          <FormField label="Dein Charakter" htmlFor="log-author">
            <select
              id="log-author"
              name="authorCharacterId"
              required
              className={missionLogInputClass}
            >
              {ownCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Mission" htmlFor="log-mission">
            <select
              id="log-mission"
              name="missionSlug"
              required
              className={missionLogInputClass}
            >
              {missions.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.title}
                </option>
              ))}
            </select>
          </FormField>
        </>
      }
    />
  );
}
