import { AUTHOR_COLORS } from "@/lib/missionFormat";
import type { DialogueMessage } from "@/lib/dialogues";
import type { ArchiveParticipant } from "@/types/archive";
import DialogueMessageActions from "./DialogueMessageActions";

// Reihenfolge kommt bereits absteigend (neueste zuerst) aus
// getDialogueMessages — kein Re-Sort nötig. Farbe wird deterministisch aus
// der Position im Teilnehmer-Array abgeleitet (AUTHOR_COLORS, bereits für
// Mission-Log-Autoren genutzt) statt separat gespeichert.
//
// currentUserId/dialogueOpen/entrySlug steuern, ob Bearbeiten/Löschen pro
// Nachricht angezeigt wird — bewusst nur bei offenen Dialogen (abgeschlossene
// Dialoge bleiben vollständig read-only, auch für den ursprünglichen Autor).
export default function DialogueThread({
  messages,
  participants,
  currentUserId = null,
  dialogueOpen = false,
  entrySlug,
}: {
  messages: DialogueMessage[];
  participants: ArchiveParticipant[];
  currentUserId?: number | null;
  dialogueOpen?: boolean;
  entrySlug?: string;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      {messages.map((msg) => {
        const colorIndex = participants.findIndex(
          (p) => p.slug === msg.characterSlug,
        );
        const color = AUTHOR_COLORS[colorIndex >= 0 ? colorIndex : 0];

        return (
          <div
            key={msg.id}
            className="dialogue-message"
            style={{ "--message-color": color } as React.CSSProperties}
          >
            <span className="dialogue-message-rail" />
            <span className="dialogue-message-body">
              <span className="dialogue-message-author">
                {msg.characterName ?? "Unbekannt"}
                {msg.editedAt && !msg.deletedAt && (
                  <span className="dialogue-message-meta">bearbeitet</span>
                )}
              </span>
              <span
                className="dialogue-message-text mission-body lcars-text text-[18px]"
                dangerouslySetInnerHTML={{ __html: msg.content }}
              />
              {dialogueOpen &&
                entrySlug &&
                !msg.deletedAt &&
                msg.authorUserId === currentUserId && (
                  <DialogueMessageActions
                    messageId={msg.id}
                    entrySlug={entrySlug}
                  />
                )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
