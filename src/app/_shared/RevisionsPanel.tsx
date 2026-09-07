"use client";
import { useActionState } from "react";
import { FormError } from "@/app/_shared/FormPrimitives";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import {
  restoreRevisionAction,
  type RevisionActionState,
} from "@/app/actions/revisions";
import {
  REVISION_KEEP,
  type ContentRevision,
  type RevisionContentType,
} from "@/lib/contentRevisionTypes";

const initialState: RevisionActionState = {};

// Versionshistorie eines Inhaltstextes: die letzten Fassungen mit Datum,
// bearbeitender Person, Länge und Vorschau — jede einzeln wiederherstellbar.
//
// Wird nur dort gerendert, wo ohnehin bearbeitet werden darf; die Action
// prüft die Rechte zusätzlich selbst (siehe actions/revisions.ts).
export default function RevisionsPanel({
  contentType,
  contentId,
  path,
  revisions,
}: {
  contentType: RevisionContentType;
  contentId: number;
  // Pfad für revalidatePath nach dem Wiederherstellen.
  path: string;
  revisions: ContentRevision[];
}) {
  return (
    <SettingsPanel
      title="Versionen"
      hint={`Frühere Fassungen des Textes — die letzten ${REVISION_KEEP} werden aufgehoben`}
      badge={
        revisions.length === 0
          ? "keine"
          : `${revisions.length} ${revisions.length === 1 ? "Fassung" : "Fassungen"}`
      }
    >
      {revisions.length === 0 ? (
        <p className="text-lcars-ink-dim text-[12px]">
          Noch keine frühere Fassung — sie entsteht beim nächsten Speichern.
        </p>
      ) : (
        <ul className="flex flex-col gap-[8px]">
          {revisions.map((r) => (
            <RevisionItem
              key={r.id}
              revision={r}
              contentType={contentType}
              contentId={contentId}
              path={path}
            />
          ))}
        </ul>
      )}
    </SettingsPanel>
  );
}

function RevisionItem({
  revision,
  contentType,
  contentId,
  path,
}: {
  revision: ContentRevision;
  contentType: RevisionContentType;
  contentId: number;
  path: string;
}) {
  const [state, formAction, pending] = useActionState(
    restoreRevisionAction,
    initialState,
  );
  return (
    <li className="rounded-[8px] border border-lcars-border bg-lcars-surface px-[12px] py-[8px]">
      <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
        <span className="text-lcars-ink-dim font-lcars-mono text-[11px]">
          {new Date(revision.createdAt).toLocaleString("de-DE")}
          {revision.editorName ? ` · ${revision.editorName}` : ""} ·{" "}
          {revision.length} Zeichen
        </span>
        <form action={formAction}>
          <input type="hidden" name="contentType" value={contentType} />
          <input type="hidden" name="contentId" value={contentId} />
          <input type="hidden" name="revisionId" value={revision.id} />
          <input type="hidden" name="path" value={path} />
          <button
            type="submit"
            disabled={pending}
            className="lcars-link-text text-lcars-tertiary-ink text-[11px] disabled:opacity-50"
          >
            {pending ? "Wird geholt…" : "Wiederherstellen"}
          </button>
        </form>
      </div>
      <p className="text-lcars-ink-light mt-[4px] text-[12px]">
        {revision.excerpt}
      </p>
      <FormError message={state.error} />
    </li>
  );
}
