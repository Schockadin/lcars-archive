"use client";
import { useActionState, useState } from "react";
import {
  editDialogueMessageAction,
  deleteDialogueMessageAction,
  getDialogueMessageSourceAction,
  type EditMessageState,
  type DeleteMessageState,
} from "@/app/actions/dialogues";

const initialEditState: EditMessageState = {};
const initialDeleteState: DeleteMessageState = {};

// Wird von DialogueThread nur für die eigenen, nicht gelöschten Nachrichten
// des Betrachters gerendert, solange der Dialog offen ist (siehe die
// Bedingung dort) — kein weiterer Sichtbarkeits-Check hier nötig, die
// Server Actions selbst prüfen Autorenschaft/offen-Status ohnehin erneut.
export default function DialogueMessageActions({
  messageId,
  entrySlug,
}: {
  messageId: number;
  entrySlug: string;
}) {
  const [editing, setEditing] = useState(false);
  const [sourceMd, setSourceMd] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editState, editAction, editPending] = useActionState(
    editDialogueMessageAction,
    initialEditState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteDialogueMessageAction,
    initialDeleteState,
  );

  // Formular nach erfolgreichem Speichern schließen — kein Effekt nötig:
  // React erlaubt das Anpassen von State während des Renderns, solange die
  // vorherige Zustandsreferenz erkannt und aktualisiert wird (verhindert
  // eine Endlosschleife), siehe "Adjusting state when a prop changes".
  const [seenEditState, setSeenEditState] = useState(editState);
  if (editState !== seenEditState) {
    setSeenEditState(editState);
    if (editState.success && editing) setEditing(false);
  }

  const startEdit = async () => {
    setLoadError(null);
    const result = await getDialogueMessageSourceAction(messageId);
    if (result.error) {
      setLoadError(result.error);
      return;
    }
    setSourceMd(result.sourceMd ?? "");
    setEditing(true);
  };

  if (editing) {
    return (
      <form action={editAction} className="flex flex-col gap-[6px] mt-[6px]">
        <input type="hidden" name="messageId" value={messageId} />
        <input type="hidden" name="entrySlug" value={entrySlug} />
        <textarea
          name="bodyMarkdown"
          required
          defaultValue={sourceMd ?? ""}
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber min-h-[80px] resize-y font-mono"
        />
        <div className="flex gap-[8px]">
          <button
            type="submit"
            disabled={editPending}
            className="lcars-switch self-start disabled:opacity-50"
          >
            {editPending ? "Wird gespeichert…" : "Speichern"}
          </button>
          <button
            type="button"
            className="lcars-switch self-start"
            onClick={() => setEditing(false)}
          >
            Abbrechen
          </button>
        </div>
        {editState?.error && (
          <p className="text-lcars-red" role="alert">
            {editState.error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="dialogue-message-actions">
      <button type="button" className="lcars-switch" onClick={startEdit}>
        Bearbeiten
      </button>
      <form action={deleteAction}>
        <input type="hidden" name="messageId" value={messageId} />
        <input type="hidden" name="entrySlug" value={entrySlug} />
        <button
          type="submit"
          disabled={deletePending}
          className="lcars-switch disabled:opacity-50"
          onClick={(e) => {
            if (!confirm("Nachricht wirklich löschen?")) {
              e.preventDefault();
            }
          }}
        >
          {deletePending ? "Wird gelöscht…" : "Löschen"}
        </button>
      </form>
      {loadError && (
        <p className="text-lcars-red" role="alert">
          {loadError}
        </p>
      )}
      {deleteState?.error && (
        <p className="text-lcars-red" role="alert">
          {deleteState.error}
        </p>
      )}
    </div>
  );
}
