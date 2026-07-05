"use client";
import { useActionState } from "react";
import { createMissionLogAction, type MissionLogFormState } from "./actions";
import {
  FormField,
  SubmitButton,
  FormError,
} from "../../../_shared/FormPrimitives";
import {
  MissionLogTitleField,
  MissionLogDateBodyFields,
  missionLogInputClass,
} from "../_shared/MissionLogFields";

const initialState: MissionLogFormState = {};

export default function NewMissionLogForm({
  userId,
  ownCharacters,
  missions,
  defaultSessionNr,
  defaultLogDate,
}: {
  userId: number;
  ownCharacters: { id: number; slug: string; name: string }[];
  missions: { slug: string; title: string }[];
  defaultSessionNr: number;
  defaultLogDate: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createMissionLogAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />

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

      <MissionLogTitleField idPrefix="log" />

      <FormField label="Session-Nr." htmlFor="log-session-nr">
        <input
          id="log-session-nr"
          name="sessionNr"
          type="number"
          min={1}
          required
          defaultValue={defaultSessionNr}
          className={missionLogInputClass}
        />
      </FormField>

      <MissionLogDateBodyFields
        idPrefix="log"
        defaults={{ logDate: defaultLogDate }}
      />

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-switch self-start disabled:opacity-50 w-[100%]"
      >
        Speichern
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}
