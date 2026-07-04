"use client";
import { useActionState } from "react";
import {
  createMissionLogVaultAction,
  type MissionLogVaultState,
} from "./actions";

const initialState: MissionLogVaultState = {};

const inputClass = "rounded-lcars-pill lcars-input";

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
    createMissionLogVaultAction,
    initialState,
  );
  const today = new Date().toISOString().slice(0, 10);

  if (state?.success) {
    return (
      <div className="lcars-text flex flex-col gap-[16px]">
        <p className="text-lcars-amber">
          Dein Missionslog wurde ins Vault committet und erscheint nach dem
          nächsten Ingest im Archiv.
        </p>
        <p>
          <a
            href={state.success.commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Commit auf GitHub ansehen
          </a>
        </p>
        <p>
          <a href={`/users/${userId}`} className="text-lcars-amber underline">
            ← Zurück zum Profil
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-[16px] max-w-[600px]"
    >
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
          className={`${inputClass} min-h-[500px] resize-y font-mono`}
        />
        <p className="text-lcars-text-dim text-[12px]">
          Unterstützt Markdown-Formatierung.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50"
      >
        {pending ? "Wird committet…" : "Log ins Vault committen"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
