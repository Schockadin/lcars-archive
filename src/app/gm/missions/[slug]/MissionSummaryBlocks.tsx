"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import type { MissionSynopsisBlock } from "@/lib/gameSessions";
import { fmtDate } from "@/lib/missionFormat";
import {
  deleteMissionSummaryBlockAction,
  updateMissionSummaryBlockAction,
  type MissionSummaryBlockActionState,
} from "./actions";

const initialState: MissionSummaryBlockActionState = {};

export default function MissionSummaryBlocks({
  missionSlug,
  missionTitle,
  blocks,
  showHeading = true,
}: {
  missionSlug: string;
  missionTitle: string;
  blocks: MissionSynopsisBlock[];
  showHeading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-[12px]">
      {showHeading && <h2 className="text-lcars-primary-ink">Summary-Blöcke</h2>}
      {blocks.length === 0 ? (
        <p className="lcars-empty-state">
          Für diese Mission gibt es noch keine Summary-Blöcke.
        </p>
      ) : (
        <ol className="flex flex-col gap-[10px]">
          {blocks.map((block) => (
            <MissionSummaryBlockRow
              key={block.id}
              block={block}
              missionSlug={missionSlug}
              missionTitle={missionTitle}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function MissionSummaryBlockRow({
  block,
  missionSlug,
  missionTitle,
}: {
  block: MissionSynopsisBlock;
  missionSlug: string;
  missionTitle: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateMissionSummaryBlockAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteMissionSummaryBlockAction,
    initialState,
  );

  return (
    <li
      id={`summary-${block.id}`}
      className="rounded-lg border border-[var(--lcars-ink-dim)]/30 p-[12px]"
    >
      <div className="mb-[6px] flex flex-wrap items-baseline justify-between gap-[8px]">
        <h3 className="font-semibold">
          {missionTitle} - Eintrag {block.missionSessionNumber ?? "?"}
        </h3>
        <span className="lcars-eyebrow">{fmtDate(block.ingameDate)}</span>
      </div>
      {!editing && (
        <div
          className="mission-body"
          dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
        />
      )}
      {editing && (
        <form
          key={state.success ?? `edit-${block.id}`}
          action={formAction}
          className="flex flex-col gap-[8px]"
        >
          <input type="hidden" name="blockId" value={block.id} />
          <input type="hidden" name="missionSlug" value={missionSlug} />
          <label className="flex flex-col gap-[4px]">
            <span className="lcars-eyebrow">Ingame-Datum</span>
            <input
              name="ingameDate"
              type="date"
              required
              defaultValue={block.ingameDate}
              className="lcars-input rounded-full self-start"
            />
          </label>
          <MarkdownEditor
            id={`mission-summary-${block.id}`}
            name="bodyMarkdown"
            rows={7}
            defaultValue={block.body}
          />
          <div className="flex flex-wrap gap-[8px]">
            <button
              type="submit"
              disabled={pending}
              className="lcars-pill-btn--outline disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              type="button"
              className="lcars-pill-btn--outline"
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
      {!editing && (
        <div className="mt-[8px] flex flex-wrap gap-[8px]">
          <button
            type="button"
            className="lcars-pill-btn--outline"
            onClick={() => setEditing(true)}
          >
            Bearbeiten
          </button>
          {block.sessionId !== null && (
            <Link
              href={`#session-${block.sessionId}`}
              className="lcars-back-link self-center"
            >
              Zur zugehörigen Session
            </Link>
          )}
          <form action={deleteAction}>
            <input type="hidden" name="blockId" value={block.id} />
            <input type="hidden" name="missionSlug" value={missionSlug} />
            <button
              type="submit"
              disabled={deletePending}
              onClick={confirmSubmit(
                `„${missionTitle} - Eintrag ${block.missionSessionNumber ?? "?"}“ wirklich löschen?`,
              )}
              className="lcars-pill-btn--outline disabled:opacity-50"
            >
              Löschen
            </button>
          </form>
        </div>
      )}
      <FormError message={state.error ?? deleteState.error} />
      {(state.success ?? deleteState.success) && (
        <FormSuccess>{state.success ?? deleteState.success}</FormSuccess>
      )}
    </li>
  );
}
