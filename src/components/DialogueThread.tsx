import { AUTHOR_COLORS } from "@/lib/missionFormat";
import type { DialogueMessage } from "@/lib/dialogues";
import type { ArchiveParticipant } from "@/types/archive";

// Reihenfolge kommt bereits absteigend (neueste zuerst) aus
// getDialogueMessages — kein Re-Sort nötig. Farbe wird deterministisch aus
// der Position im Teilnehmer-Array abgeleitet (AUTHOR_COLORS, bereits für
// Mission-Log-Autoren genutzt) statt separat gespeichert.
export default function DialogueThread({
  messages,
  participants,
}: {
  messages: DialogueMessage[];
  participants: ArchiveParticipant[];
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
              </span>
              <span
                className="dialogue-message-text mission-body lcars-text text-[18px]"
                dangerouslySetInnerHTML={{ __html: msg.content }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
