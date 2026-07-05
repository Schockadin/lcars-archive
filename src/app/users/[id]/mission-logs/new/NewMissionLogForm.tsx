"use client";
import { useActionState } from "react";
import { createMissionLogAction, type MissionLogFormState } from "./actions";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

const initialState: MissionLogFormState = {};

const inputClass = "rounded-lcars-pill lcars-input";
const textAreaClass =
  "rounded-lcars-pill lcars-input min-h-[500px] resize-y font-mono";

export default function NewMissionLogForm({
  userId,
  ownCharacters,
  missions,
  defaultSessionNr,
}: {
  userId: number;
  ownCharacters: { id: number; slug: string; name: string }[];
  missions: { slug: string; title: string }[];
  defaultSessionNr: number;
}) {
  const [state, formAction, pending] = useActionState(
    createMissionLogAction,
    initialState,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="log-author" className="lcars-eyebrow">
          Dein Charakter
        </label>
        <select
          id="log-author"
          name="authorCharacterId"
          required
          className={inputClass}
        >
          {ownCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="log-mission" className="lcars-eyebrow">
          Mission
        </label>
        <select
          id="log-mission"
          name="missionSlug"
          required
          className={inputClass}
        >
          {missions.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="log-title" className="lcars-eyebrow">
          Titel
        </label>
        <input
          id="log-title"
          name="title"
          type="text"
          required
          maxLength={MAX_TITLE_LENGTH}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="log-session-nr" className="lcars-eyebrow">
          Session-Nr.
        </label>
        <input
          id="log-session-nr"
          name="sessionNr"
          type="number"
          min={1}
          required
          defaultValue={defaultSessionNr}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="log-date" className="lcars-eyebrow">
          Datum
        </label>
        <input
          id="log-date"
          name="logDate"
          type="date"
          defaultValue={today}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="log-body" className="lcars-eyebrow">
          Log-Text
        </label>
        <textarea
          id="log-body"
          name="bodyMarkdown"
          required
          className={textAreaClass}
        />
        <p className="text-lcars-text-dim text-[12px]">
          Unterstützt Markdown-Formatierung.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50 w-[100%]"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
