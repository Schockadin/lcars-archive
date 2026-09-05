"use client";
import { useActionState, useState } from "react";
import {
  editDialogueMessageAction,
  deleteDialogueMessageAction,
  getDialogueMessageSourceAction,
  type EditMessageState,
  type DeleteMessageState,
} from "@/app/actions/dialogues";
import { PencilIcon, TrashIcon, CheckIcon, XIcon } from "@/lib/icons";
import { confirmSubmit } from "@/lib/confirmSubmit";
import { FormError } from "@/app/_shared/FormPrimitives";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";

const initialEditState: EditMessageState = {};
const initialDeleteState: DeleteMessageState = {};

// Wird von DialogueThread nur für nicht gelöschte Nachrichten gerendert —
// entweder die eigenen des Betrachters in einem offenen Dialog, oder jede
// Nachricht für Admins/GMs (Moderation, auch in geschlossenen Dialogen).
// Kein weiterer Sichtbarkeits-Check hier nötig, die Server Actions prüfen
// Autorenschaft/offen-Status/Moderatorrolle ohnehin serverseitig erneut.
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
        {/* Wie im Antwortformular: der Beitrag ist Markdown, also derselbe
            Editor mit Toolbar und Vorschau. */}
        <MarkdownEditor
          id={`dlg-msg-${messageId}-body`}
          name="bodyMarkdown"
          required
          rows={10}
          defaultValue={sourceMd ?? ""}
        />
        {/* Icon- statt Textbuttons (gleiches Muster wie
            PreviewConfirmFooter.tsx/die eigenen Icon-Buttons weiter unten in
            diesem File) — vorher zwei 250px-Textbuttons nebeneinander, die
            auf schmalen Bildschirmen überliefen. */}
        <div className="flex gap-[8px]">
          <button
            type="button"
            className="lcars-icon-btn lcars-icon-btn--danger size-[40px]"
            onClick={() => setEditing(false)}
            aria-label="Abbrechen"
            title="Abbrechen"
          >
            <XIcon />
          </button>
          <button
            type="submit"
            disabled={editPending}
            className="lcars-icon-btn size-[40px] disabled:opacity-50"
            aria-label={editPending ? "Wird gespeichert…" : "Speichern"}
            title={editPending ? "Wird gespeichert…" : "Speichern"}
          >
            <CheckIcon />
          </button>
        </div>
        <FormError message={editState?.error} />
      </form>
    );
  }

  return (
    <div className="dialogue-message-actions">
      {/* Icon-Buttons statt beschrifteter Pillen, analog dem
          "Follow beenden"-Muster in FollowList.tsx (/user/follow) — auf
          mobile kompakter (30px statt 40px), da hier pro Nachricht zwei
          Buttons nebeneinander stehen. */}
      <button
        type="button"
        className="lcars-icon-btn size-[40px] max-sm:size-[30px]"
        onClick={startEdit}
        aria-label="Nachricht bearbeiten"
        title="Nachricht bearbeiten"
      >
        <PencilIcon />
      </button>
      <form action={deleteAction}>
        <input type="hidden" name="messageId" value={messageId} />
        <input type="hidden" name="entrySlug" value={entrySlug} />
        <button
          type="submit"
          disabled={deletePending}
          className="lcars-icon-btn lcars-icon-btn--danger size-[40px] max-sm:size-[30px] disabled:opacity-50"
          aria-label="Nachricht löschen"
          title="Nachricht löschen"
          onClick={confirmSubmit("Nachricht wirklich löschen?")}
        >
          <TrashIcon />
        </button>
      </form>
      <FormError message={loadError ?? undefined} />
      <FormError message={deleteState?.error} />
    </div>
  );
}
