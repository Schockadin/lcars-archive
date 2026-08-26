"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  postDialogueMessageAction,
  type DialogueMessageState,
} from "@/app/actions/dialogues";
import type { DialogueReplyCharacter } from "./DialogueLiveView";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import { FormError } from "@/app/_shared/FormPrimitives";

const initialState: DialogueMessageState = {};

// Wird nur gerendert, wenn der Aufrufer (die Server-Seite) das auch will —
// /dialogues/[slug] prüft Teilnahme + offen-Status bereits serverseitig.
// canReplyNow ist zusätzlich für Dialoge mit mehr als zwei Teilnehmenden
// relevant: dort muss die aufrufende Person zuerst die Antwort-Reservierung
// halten (siehe DialogueLockPanel.tsx). Bei genau zwei Teilnehmenden ist
// canReplyNow immer true.
//
// replyCharacters = die eigenen Teilnehmer-Charaktere, die JETZT antworten
// dürfen (der zuletzt am Zug gewesene ist ausgenommen — Selbstgespräch-Verbot).
// Bei genau einem wird nur angezeigt, mit wem geantwortet wird; bei mehreren
// eine Auswahl. hasOnlyBlockedCharacter: die Person hat zwar Charaktere im
// Gespräch, aber alle waren zuletzt am Zug → statt des Formulars ein Hinweis.
export default function DialogueReplyForm({
  entrySlug,
  canReplyNow = true,
  replyCharacters,
  hasOnlyBlockedCharacter = false,
  onSent,
}: {
  entrySlug: string;
  canReplyNow?: boolean;
  replyCharacters: DialogueReplyCharacter[];
  hasOnlyBlockedCharacter?: boolean;
  onSent?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    postDialogueMessageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Gewählter Antwort-Charakter (kontrolliert). Bleibt gültig, auch wenn sich
  // die Auswahlliste durch neue Nachrichten (Poll) ändert — fällt sonst auf den
  // ersten verfügbaren zurück.
  const [charId, setCharId] = useState<number | undefined>(
    replyCharacters[0]?.id,
  );
  const validCharId = replyCharacters.some((c) => c.id === charId)
    ? charId
    : replyCharacters[0]?.id;

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onSent?.();
    }
  }, [state, onSent]);

  if (!canReplyNow) return null;

  if (hasOnlyBlockedCharacter || replyCharacters.length === 0) {
    return (
      <p className="text-lcars-primary text-[13px] mt-[16px]" role="status">
        Dein Charakter war zuletzt am Zug — warte, bis jemand anderes
        geantwortet hat.
      </p>
    );
  }

  const single = replyCharacters.length === 1;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-[8px] mt-[16px]"
    >
      <input type="hidden" name="entrySlug" value={entrySlug} />

      {/* Immer sichtbar: mit welchem Charakter geantwortet wird. Bei mehreren
          eigenen Teilnehmer-Charakteren als Auswahl, sonst als reine Anzeige
          (+ Hidden-Input für die characterId). */}
      {single ? (
        <p className="lcars-eyebrow">
          Antworten als{" "}
          <span className="text-lcars-text-contrast">
            {replyCharacters[0].name}
          </span>
          <input type="hidden" name="characterId" value={replyCharacters[0].id} />
        </p>
      ) : (
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Antworten als</span>
          <select
            name="characterId"
            value={validCharId}
            onChange={(e) => setCharId(Number(e.target.value))}
            className="lcars-input rounded-lcars-pill self-start"
          >
            {replyCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label htmlFor="dlg-reply-body" className="lcars-eyebrow">
        Antworten
      </label>
      <textarea
        id="dlg-reply-body"
        name="bodyMarkdown"
        required
        className="rounded-lcars-pill lcars-input min-h-[150px] resize-y font-mono"
      />
      <p className="text-lcars-text text-[14px]">
        <MarkdownFormatHint />
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {pending ? "Wird gesendet…" : "Senden"}
      </button>

      <FormError message={state?.error} />
    </form>
  );
}
