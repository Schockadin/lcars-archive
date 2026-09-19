"use client";
import { AUTHOR_COLORS } from "@/lib/missionFormat";
import type { DialogueMessage } from "@/lib/dialogues";
import type { ArchiveParticipant } from "@/types/archive";
import DialogueMessageActions from "./DialogueMessageActions";
import { formatDateTimeShort, toIsoDateTime } from "@/utils/formateISODate";

// Reihenfolge kommt bereits chronologisch (ältester zuerst) aus
// getDialogueMessages — kein Re-Sort nötig. Farbe kommt von der Charakter-
// Farbe des Sprechers (msg.characterColor, siehe src/lib/characterColor.ts —
// pro Charakter, nicht pro User, damit "Multis" für jeden ihrer Charaktere
// eine eigene Farbe haben können) — dieselbe Farbe wie im Fließtext-Modus
// abgeschlossener Dialoge (DialogueFlowingText.tsx). AUTHOR_COLORS
// (positionsbasiert, bereits für Mission-Log-Autoren genutzt) bleibt nur noch
// Fallback für Nachrichten ohne Charakter (z.B. gelöscht).
//
// Rendert einheitlich die farbige Karte, egal ob offener oder
// geschlossener Dialog — die alternative Ansicht für geschlossene Dialoge
// ist jetzt der generierte Fließtext (archive_entries.content, siehe
// DialogueViewToggle.tsx/ArchiveEntryBody.tsx), nicht mehr eine
// eingefärbte Variante dieser Komponente.
//
// currentUserId/dialogueOpen/entrySlug steuern, ob Bearbeiten/Löschen pro
// Nachricht angezeigt wird — bei offenen Dialogen für den eigenen Autor,
// unabhängig davon für Admins (Moderation): die dürfen jede Nachricht in
// jedem Dialog bearbeiten/löschen, auch fremde und auch nach Abschluss (die
// Server Actions setzen das serverseitig durch, siehe editDialogueMessage/
// deleteDialogueMessage in dialoguesCore.ts). GM hat dieses Moderationsrecht
// bewusst nicht (mehr) — anders als z.B. beim Abschließen eines Dialogs.
export default function DialogueThread({
  messages,
  participants,
  currentUserId = null,
  dialogueOpen = false,
  entrySlug,
  canModerate = false,
}: {
  messages: DialogueMessage[];
  participants: ArchiveParticipant[];
  currentUserId?: number | null;
  dialogueOpen?: boolean;
  entrySlug?: string;
  // Darf fremde Nachrichten moderieren (Recht dialogues.moderate) — ersetzt
  // den früheren Rollen-Check „viewerRole === admin“.
  canModerate?: boolean;
}) {
  const isModerator = canModerate;

  // Der Sprung ans Ende des Verlaufs (nur bei offenen Gesprächen, wie in
  // einem Chat) liegt seit v1.46 in DialogueLiveView: Dort steht unter
  // diesem Verlauf das am unteren Rand klebende Antwortfeld, das die letzte
  // Nachricht sonst genau nach dem Sprung verdecken würde — und nur der
  // Aufrufer kennt beides. Hier wird deshalb nicht mehr gescrollt.
  return (
    <div className="flex flex-col gap-[10px]">
      {messages.map((msg) => {
        const canModerate =
          !msg.deletedAt &&
          ((dialogueOpen && msg.authorUserId === currentUserId) || isModerator);
        const editedBadge = msg.editedAt && !msg.deletedAt && (
          <span className="dialogue-message-meta">bearbeitet</span>
        );
        // Wann wurde diese Nachricht abgeschickt? Nur im laufenden Gespräch
        // — dort wird wie in einem Chat mitgelesen, und der Abstand zwischen
        // zwei Beiträgen (Minuten oder Tage) ist Teil der Information. Im
        // abgeschlossenen Gespräch ist der Verlauf ein zusammenhängender
        // Text; echte Uhrzeiten aus der Entstehung stören dort nur.
        // formatDateTimeShort setzt die Zeitzone fest auf Europe/Berlin —
        // Server-Render und Hydration liefern denselben String.
        const sentAt = dialogueOpen && (
          <time
            className="dialogue-message-meta"
            dateTime={toIsoDateTime(msg.createdAt)}
          >
            {formatDateTimeShort(msg.createdAt)}
          </time>
        );

        const colorIndex = participants.findIndex(
          (p) => p.slug === msg.characterSlug,
        );
        const color =
          msg.characterColor ??
          AUTHOR_COLORS[colorIndex >= 0 ? colorIndex : 0];

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
                {sentAt}
                {editedBadge}
              </span>
              <span
                className="dialogue-message-text mission-body lcars-text text-[18px]"
                dangerouslySetInnerHTML={{ __html: msg.content }}
              />
              {entrySlug && canModerate && (
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
