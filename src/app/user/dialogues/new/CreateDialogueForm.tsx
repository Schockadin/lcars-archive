"use client";
import { useActionState, useState } from "react";
import { createDialogueAction, type CreateDialogueState } from "./actions";
import type {
  CharacterWithOwner,
  NpcCharacterOption,
} from "@/lib/characters";
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

export default function CreateDialogueForm({
  userId,
  ownCharacters,
  partnerCharacters,
  npcCharacters,
  canPlayNpcs,
  gms,
  locations,
  defaultLogDate,
}: {
  userId: number;
  ownCharacters: { id: number; slug: string; name: string }[];
  partnerCharacters: CharacterWithOwner[];
  // NPCs (Charaktere ohne Spieler) — als Gegenüber für alle, als eigener
  // Sprecher-Charakter nur für die Spielleitung (canPlayNpcs).
  npcCharacters: NpcCharacterOption[];
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
  const npcIds = new Set(npcCharacters.map((c) => c.id));
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
      className="flex flex-col gap-[16px] max-w-[var(--lcars-content-w)]"
    >
      <input type="hidden" name="userId" value={userId} />

      <FormField
        label="Dein Charakter"
        htmlFor="dlg-own-character"
        hint={
          canPlayNpcs && npcCharacters.length > 0
            ? "Als Spielleitung kannst du das Gespräch auch aus Sicht eines NPC beginnen."
            : undefined
        }
      >
        <select
          id="dlg-own-character"
          name="ownCharacterId"
          required
          className={inputClass}
          onChange={(e) => setOwnIsNpc(npcIds.has(Number(e.target.value)))}
        >
          {ownCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {canPlayNpcs && npcCharacters.length > 0 && (
            <optgroup label="NPCs (von dir gespielt)">
              {npcCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
          name="partnerCharacterIds"
          multiple
          required
          size={Math.min(
            6,
            Math.max(partnerCharacters.length + npcCharacters.length, 2),
          )}
          className={`${inputClass} h-auto py-[8px]`}
          onChange={(e) =>
            setNpcPartnerCount(
              [...e.target.selectedOptions].filter((o) =>
                npcIds.has(Number(o.value)),
              ).length,
            )
          }
        >
          {partnerCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (gespielt von {c.playerName})
            </option>
          ))}
          {npcCharacters.length > 0 && (
            <optgroup label="NPCs">
              {npcCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              className={inputClass}
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
          className={inputClass}
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
