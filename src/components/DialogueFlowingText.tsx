"use client";
import { colorizeDirectSpeech, characterColorVar } from "@/lib/characterColor";
import type { DialogueMessage } from "@/lib/dialoguesCore";

// Fließtext-Ansicht eines abgeschlossenen Dialogs: reiht die (nicht
// gelöschten) Nachrichten narrativ aneinander — dieselbe Textbasis wie der
// gespeicherte Fließtext (archive_entries.content, siehe
// buildDialogueFlowingText), hier aber pro Nachricht die wörtliche Rede
// („…") in der Charakter-Farbe des jeweiligen Sprechers eingefärbt.
//
// Bewusst zur Renderzeit aus den Nachrichten aufgebaut (statt in den
// gespeicherten content eingebacken): funktioniert dadurch sofort auch für
// bereits vor diesem Feature abgeschlossene Dialoge, und eine später im
// Profil geänderte Charakter-Farbe schlägt ohne Backfill durch. Gelöschte
// Nachrichten fehlen ganz (kein Platzhalter), exakt wie im gespeicherten
// Fließtext.
export default function DialogueFlowingText({
  messages,
}: {
  messages: DialogueMessage[];
}) {
  const html = messages
    .filter((m) => !m.deletedAt)
    .map((m) =>
      m.characterColor
        ? colorizeDirectSpeech(m.content, characterColorVar(m.characterColor))
        : m.content,
    )
    .join("");

  return (
    <div
      className="mission-body lcars-text"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
