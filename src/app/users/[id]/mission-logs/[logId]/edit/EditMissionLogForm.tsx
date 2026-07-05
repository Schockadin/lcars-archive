"use client";
import { useActionState } from "react";
import { updateMissionLogAction, type EditMissionLogState } from "./actions";
import type { OwnMissionLogForEdit } from "@/lib/missions";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

const initialState: EditMissionLogState = {};

const inputClass = "rounded-lcars-pill lcars-input w-full sm:w-[400px]";
const textAreaClass =
  "rounded-lcars-pill lcars-input min-h-[500px] resize-y font-mono";

export default function EditMissionLogForm({
  userId,
  log,
}: {
  userId: number;
  log: OwnMissionLogForEdit;
}) {
  const [state, formAction, pending] = useActionState(
    updateMissionLogAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="logId" value={log.id} />

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="edit-log-title" className="lcars-eyebrow">
          Titel
        </label>
        <input
          id="edit-log-title"
          name="title"
          type="text"
          required
          maxLength={MAX_TITLE_LENGTH}
          defaultValue={log.title}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="edit-log-date" className="lcars-eyebrow">
          Datum
        </label>
        <input
          id="edit-log-date"
          name="logDate"
          type="date"
          defaultValue={log.logDate ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="edit-log-body" className="lcars-eyebrow">
          Log-Text
        </label>
        <textarea
          id="edit-log-body"
          name="bodyMarkdown"
          required
          defaultValue={log.sourceMarkdown}
          className={textAreaClass}
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
        {pending ? "Wird gespeichert…" : "Änderungen speichern"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
