"use client";
import { useActionState } from "react";
import {
  createMissionVaultAction,
  type MissionVaultState,
} from "./actions";

const initialState: MissionVaultState = {};

const inputClass = "rounded-lcars-pill lcars-input";
const textAreaClass =
  "rounded-lcars-pill lcars-input min-h-[400px] resize-y font-mono";

export default function NewMissionForm({ userId }: { userId: number }) {
  const [state, formAction, pending] = useActionState(
    createMissionVaultAction,
    initialState,
  );

  if (state?.success) {
    return (
      <div className="lcars-text flex flex-col gap-[16px]">
        <p className="text-lcars-amber">
          Die Mission wurde ins Vault committet und erscheint nach dem
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
          <a href={`/users/${userId}/content`} className="text-lcars-amber underline">
            ← Zurück zu Meine Inhalte
          </a>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="mission-title" className="lcars-eyebrow">
          Titel
        </label>
        <input
          id="mission-title"
          name="title"
          type="text"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="mission-slug" className="lcars-eyebrow">
          Slug (optional)
        </label>
        <input id="mission-slug" name="slug" type="text" className={inputClass} />
        <p className="text-lcars-text-dim text-[12px]">
          Bestimmt den Vault-Ordnernamen. Bleibt das Feld leer, wird der Slug
          aus dem Titel abgeleitet.
        </p>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="mission-status" className="lcars-eyebrow">
          Status
        </label>
        <select
          id="mission-status"
          name="status"
          defaultValue="active"
          className={inputClass}
        >
          <option value="active">Aktiv</option>
          <option value="completed">Abgeschlossen</option>
          <option value="failed">Gescheitert</option>
          <option value="abandoned">Abgebrochen</option>
        </select>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="mission-started" className="lcars-eyebrow">
          Start
        </label>
        <input
          id="mission-started"
          name="startedAt"
          type="date"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="mission-ended" className="lcars-eyebrow">
          Ende (optional)
        </label>
        <input
          id="mission-ended"
          name="endedAt"
          type="date"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="mission-tags" className="lcars-eyebrow">
          Tags (kommagetrennt)
        </label>
        <input id="mission-tags" name="tags" type="text" className={inputClass} />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="mission-body" className="lcars-eyebrow">
          Zusammenfassung
        </label>
        <textarea
          id="mission-body"
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
