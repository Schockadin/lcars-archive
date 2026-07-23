"use client";
import { useEffect, useRef } from "react";
import { AUTHOR_COLORS } from "@/lib/missionFormat";
import type { DialogueMessage } from "@/lib/dialogues";
import type { ArchiveParticipant } from "@/types/archive";
import DialogueMessageActions from "./DialogueMessageActions";

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
  viewerRole = null,
}: {
  messages: DialogueMessage[];
  participants: ArchiveParticipant[];
  currentUserId?: number | null;
  dialogueOpen?: boolean;
  entrySlug?: string;
  viewerRole?: "admin" | "gm" | "player" | "viewer" | "guest" | null;
}) {
  const isModerator = viewerRole === "admin";
  const containerRef = useRef<HTMLDivElement>(null);

  // Bei offenen Dialogen direkt zur letzten Nachricht springen (wie ein
  // Chat), statt den Verlauf von oben lesen zu müssen — nur beim initialen
  // Mount (leeres Deps-Array), damit spätere Polls (siehe
  // DialogueLiveView.tsx) die Leseposition nicht immer wieder nach unten
  // reißen, während gerade ältere Nachrichten gelesen werden. Geschlossene
  // Dialoge bleiben unangetastet — dort ist der gesamte, meist kürzere
  // Verlauf (oder der Fließtext) das eigentliche Leseerlebnis.
  useEffect(() => {
    if (!dialogueOpen) return;
    containerRef.current?.lastElementChild?.scrollIntoView({
      behavior: "instant",
      block: "end",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-[10px]">
      {messages.map((msg) => {
        const canModerate =
          !msg.deletedAt &&
          ((dialogueOpen && msg.authorUserId === currentUserId) || isModerator);
        const editedBadge = msg.editedAt && !msg.deletedAt && (
          <span className="dialogue-message-meta">bearbeitet</span>
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
