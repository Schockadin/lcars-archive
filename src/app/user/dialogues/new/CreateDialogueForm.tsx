"use client";
import { useActionState, useState } from "react";
import { createDialogueAction, type CreateDialogueState } from "./actions";
import type { CharacterWithOwner } from "@/lib/characters";
import type { NpcOption } from "@/lib/archive";
import { speakerKey } from "@/lib/dialogueSpeaker";
import type { GmContact } from "@/lib/users";
import {
  FormField,
  SubmitButton,
  FormError,
} from "@/app/_shared/FormPrimitives";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";

const initialState: CreateDialogueState = {};

const inputClass = "rounded-lcars-pill lcars-input";
// Selects tragen durchgängig lcars-input + rounded-full (siehe die übrigen
// Auswahlfelder der App); die Textfelder daneben behalten ihren Pillen-Radius.
const selectClass = "lcars-input rounded-full";

export default function CreateDialogueForm({
  userId,
  ownCharacters,
  partnerCharacters,
  npcs,
  canPlayNpcs,
  gms,
  locations,
  defaultLogDate,
}: {
  userId: number;
  ownCharacters: { id: number; slug: string; name: string }[];
  partnerCharacters: CharacterWithOwner[];
  // NPCs sind Datenbank-Einträge der Kategorie "npc" — als Gegenüber für
  // alle, als eigener Sprecher nur für die Spielleitung (canPlayNpcs).
  npcs: NpcOption[];
  canPlayNpcs: boolean;
  // Auswahl „wer spielt die NPCs?" — nur befüllt, wenn die anfragende Person
  // die NPCs NICHT selbst spielt (sonst ist sie es selbst).
  gms: GmContact[];
  locations: { slug: string; title: string }[];
  defaultLogDate: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createDialogueAction,
    initialState,
  );

  // Ist ein NPC beteiligt? Entscheidet, ob nach der Spielleitung gefragt
  // wird. Verbindlich geprüft wird das ohnehin in der Action.
  const [ownIsNpc, setOwnIsNpc] = useState(
    canPlayNpcs && ownCharacters.length === 0,
  );
  const [npcPartnerCount, setNpcPartnerCount] = useState(0);
  const npcInvolved = ownIsNpc || npcPartnerCount > 0;
  // Bei genau einer Spielleitung gibt es nichts zu wählen — sie wird still
  // mitgeschickt (die Action setzt sie auch ohne Feld, das Feld hält die
  // Anzeige nur ehrlich).
  const needsGmChoice = npcInvolved && !canPlayNpcs && gms.length > 1;

  return (
    <form
      action={formAction}
      className="lcars-wide-column flex flex-col gap-[16px]"
    >
      <input type="hidden" name="userId" value={userId} />

      <FormField
        label="Dein Charakter"
        htmlFor="dlg-own-character"
        hint={
          canPlayNpcs && npcs.length > 0
            ? "Als Spielleitung kannst du das Gespräch auch aus Sicht eines NPC beginnen."
            : undefined
        }
      >
        <select
          id="dlg-own-character"
          name="ownSpeaker"
          required
          className={selectClass}
          onChange={(e) => setOwnIsNpc(e.target.value.startsWith("n"))}
        >
          {ownCharacters.map((c) => (
            <option
              key={c.id}
              value={speakerKey({ kind: "character", id: c.id })}
            >
              {c.name}
            </option>
          ))}
          {canPlayNpcs && npcs.length > 0 && (
            <optgroup label="NPCs (von dir gespielt)">
              {npcs.map((n) => (
                <option
                  key={n.id}
                  value={speakerKey({ kind: "npc", id: n.id })}
                >
                  {n.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </FormField>

      <FormField
        label="Gesprächspartner"
        htmlFor="dlg-partner-character"
        hint="Mehrfachauswahl per Strg/Cmd- oder Shift-Klick möglich — ein Gespräch kann bereits bei der Erstellung mehr als zwei Teilnehmende haben. NPCs schreibt die Spielleitung."
      >
        <select
          id="dlg-partner-character"
          name="partners"
          multiple
          required
          size={Math.min(6, Math.max(partnerCharacters.length + npcs.length, 2))}
          className={`${selectClass} h-auto py-[8px]`}
          onChange={(e) =>
            setNpcPartnerCount(
              [...e.target.selectedOptions].filter((o) =>
                o.value.startsWith("n"),
              ).length,
            )
          }
        >
          {partnerCharacters.map((c) => (
            <option
              key={c.id}
              value={speakerKey({ kind: "character", id: c.id })}
            >
              {c.name} (gespielt von {c.playerName})
            </option>
          ))}
          {npcs.length > 0 && (
            <optgroup label="NPCs">
              {npcs.map((n) => (
                <option
                  key={n.id}
                  value={speakerKey({ kind: "npc", id: n.id })}
                >
                  {n.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </FormField>

      {/* Wer schreibt für die NPCs? Nur wenn welche beteiligt sind und die
          anfragende Person sie nicht selbst spielt. Bei genau einer
          Spielleitung entfällt die Wahl — dann steht nur, wer es sein wird. */}
      {npcInvolved && !canPlayNpcs && (
        <FormField
          label="Spielleitung für die NPCs"
          htmlFor="dlg-npc-speaker"
          hint="Diese Person schreibt in diesem Gespräch für die beteiligten NPCs."
        >
          {needsGmChoice ? (
            <select
              id="dlg-npc-speaker"
              name="npcSpeakerUserId"
              required
              className={selectClass}
            >
              {gms.map((gm) => (
                <option key={gm.id} value={gm.id}>
                  {gm.name}
                </option>
              ))}
            </select>
          ) : (
            // Genau eine Spielleitung: nichts zu wählen. Das sichtbare Feld
            // zeigt nur, wer es sein wird; mitgeschickt wird die ID.
            <>
              <input
                id="dlg-npc-speaker"
                type="text"
                readOnly
                value={gms[0]?.name ?? "Keine Spielleitung verfügbar"}
                className={inputClass}
              />
              {gms[0] && (
                <input
                  type="hidden"
                  name="npcSpeakerUserId"
                  value={gms[0].id}
                />
              )}
            </>
          )}
        </FormField>
      )}

      <FormField label="Titel" htmlFor="dlg-title">
        <input
          id="dlg-title"
          name="title"
          type="text"
          required
          className={inputClass}
        />
      </FormField>

      <FormField label="Schauplatz" htmlFor="dlg-setting">
        <input
          id="dlg-setting"
          name="setting"
          type="text"
          className={inputClass}
        />
      </FormField>

      <FormField label="Ort" htmlFor="dlg-location">
        <select
          id="dlg-location"
          name="locationSlug"
          defaultValue=""
          className={selectClass}
        >
          <option value="">Kein Ort</option>
          {locations.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.title}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Datum" htmlFor="dlg-date">
        <input
          id="dlg-date"
          name="logDate"
          type="date"
          defaultValue={defaultLogDate ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Tags (kommagetrennt)" htmlFor="dlg-tags">
        <input id="dlg-tags" name="tags" type="text" className={inputClass} />
      </FormField>

      <FormField
        label="Erste Nachricht"
        htmlFor="dlg-body"
        hint={<MarkdownFormatHint />}
      >
        <MarkdownEditor id="dlg-body" required large />
      </FormField>

      <div className="flex items-center gap-[8px]">
        <input
          id="dlg-subscribe-self"
          name="subscribeSelf"
          type="checkbox"
          defaultChecked
          className="h-[16px] w-[16px]"
        />
        <label htmlFor="dlg-subscribe-self" className="lcars-text text-[14px]">
          Mich über neue Nachrichten in diesem Gespräch benachrichtigen
        </label>
      </div>

      <SubmitButton
        pending={pending}
        pendingLabel="Wird angelegt…"
        className="lcars-pill-btn--outline self-start disabled:opacity-50 w-[100%]"
      >
        Gespräch beginnen
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}
