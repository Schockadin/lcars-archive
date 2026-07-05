"use client";
import { useActionState } from "react";
import {
  updateMissionAction,
  deleteMissionAction,
  type EditMissionState,
} from "./actions";
import type { MissionDetail } from "@/types/missions";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

const initialState: EditMissionState = {};

const inputClass = "rounded-lcars-pill lcars-input w-full sm:w-[400px]";
const textAreaClass =
  "rounded-lcars-pill lcars-input min-h-[400px] resize-y font-mono";

export default function EditMissionForm({
  mission,
}: {
  mission: MissionDetail;
}) {
  const [state, formAction, pending] = useActionState(
    updateMissionAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteMissionAction,
    initialState,
  );

  return (
    <>
      <form action={formAction} className="flex flex-col gap-[16px]">
        <input type="hidden" name="missionId" value={mission.id} />

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="edit-mission-title" className="lcars-eyebrow">
            Titel
          </label>
          <input
            id="edit-mission-title"
            name="title"
            type="text"
            required
            maxLength={MAX_TITLE_LENGTH}
            defaultValue={mission.title}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="edit-mission-status" className="lcars-eyebrow">
            Status
          </label>
          <select
            id="edit-mission-status"
            name="status"
            defaultValue={mission.status}
            className={inputClass}
          >
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="failed">Gescheitert</option>
            <option value="abandoned">Abgebrochen</option>
          </select>
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="edit-mission-started" className="lcars-eyebrow">
            Start
          </label>
          <input
            id="edit-mission-started"
            name="startedAt"
            type="date"
            defaultValue={mission.started_at ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="edit-mission-ended" className="lcars-eyebrow">
            Ende (optional)
          </label>
          <input
            id="edit-mission-ended"
            name="endedAt"
            type="date"
            defaultValue={mission.ended_at ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="edit-mission-tags" className="lcars-eyebrow">
            Tags (kommagetrennt)
          </label>
          <input
            id="edit-mission-tags"
            name="tags"
            type="text"
            defaultValue={mission.metadata.tags.join(", ")}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="edit-mission-body" className="lcars-eyebrow">
            Zusammenfassung
          </label>
          <textarea
            id="edit-mission-body"
            name="bodyMarkdown"
            required
            defaultValue={mission.sourceMarkdown ?? ""}
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

      <section className="flex flex-col gap-[12px] mt-[32px]">
        <h2 className="text-lcars-red">Gefahrenzone</h2>
        <form action={deleteAction}>
          <input type="hidden" name="missionId" value={mission.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="lcars-switch disabled:opacity-50"
            onClick={(e) => {
              if (
                !confirm(
                  `Mission "${mission.title}" wirklich endgültig löschen? Alle zugehörigen Mission-Logs werden mit gelöscht — das lässt sich nicht rückgängig machen.`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {deletePending ? "Wird gelöscht…" : "Mission löschen"}
          </button>
        </form>
        {deleteState?.error && (
          <p className="text-lcars-red" role="alert">
            {deleteState.error}
          </p>
        )}
      </section>
    </>
  );
}
