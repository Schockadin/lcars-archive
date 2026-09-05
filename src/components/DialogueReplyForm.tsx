"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  postDialogueMessageAction,
  type DialogueMessageState,
} from "@/app/actions/dialogues";
import type { DialogueReplyCharacter } from "./DialogueLiveView";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
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
  const [charKey, setCharKey] = useState<string | undefined>(
    replyCharacters[0]?.key,
  );
  const validCharKey = replyCharacters.some((c) => c.key === charKey)
    ? charKey
    : replyCharacters[0]?.key;

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onSent?.();
    }
  }, [state, onSent]);

  if (!canReplyNow) return null;

  if (hasOnlyBlockedCharacter || replyCharacters.length === 0) {
    return (
      <p className="text-lcars-primary-ink text-[13px] mt-[16px]" role="status">
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
          (+ Hidden-Input für den Sprecher-Schlüssel). */}
      {single ? (
        <p className="lcars-eyebrow">
          Antworten als{" "}
          <span className="text-lcars-ink-contrast">
            {replyCharacters[0].name}
          </span>
          <input type="hidden" name="speaker" value={replyCharacters[0].key} />
        </p>
      ) : (
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Antworten als</span>
          <select
            name="speaker"
            value={validCharKey}
            onChange={(e) => setCharKey(e.target.value)}
            className="lcars-input rounded-full self-start"
          >
            {replyCharacters.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label htmlFor="dlg-reply-body" className="lcars-eyebrow">
        Antworten
      </label>
      {/* Der Beitrag wird als Markdown gerendert — deshalb hier derselbe
          Editor mit Toolbar und Vorschau wie in den Content-Formularen,
          statt eines nackten Eingabefelds. */}
      <MarkdownEditor id="dlg-reply-body" name="bodyMarkdown" required rows={10} />
      <p className="text-lcars-ink text-[14px]">
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
