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
import EditorDraftForm from "@/components/ContentEditor/EditorDraftForm";

const initialState: CreateDialogueState = {};

const inputClass = "rounded-lcars-pill lcars-input";
// Auswahlfelder tragen durchgängig lcars-input + rounded-full; die Textfelder
// daneben behalten ihren Pillen-Radius.
const selectClass = "lcars-input rounded-full";
// Das Feld zur Wahl des eigenen Sprechers bleibt ein normales, einzelnes
// Auswahlfeld mit Pillen-Rundung.
const characterListClass = "lcars-input rounded-lcars-pill";

export default function CreateDialogueForm({
  userId,
  draftOnCreate = false,
  ownCharacters,
  partnerCharacters,
  npcs,
  canPlayNpcs,
  gms,
  locations,
  defaultLogDate,
}: {
  userId: number;
  draftOnCreate?: boolean;
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
  const [selectedPartnerKeys, setSelectedPartnerKeys] = useState<string[]>([]);
  const npcPartnerCount = selectedPartnerKeys.filter((key) =>
    key.startsWith("n"),
  ).length;
  const npcInvolved = ownIsNpc || npcPartnerCount > 0;
  // Bei genau einer Spielleitung gibt es nichts zu wählen — sie wird still
  // mitgeschickt (die Action setzt sie auch ohne Feld, das Feld hält die
  // Anzeige nur ehrlich).
  const needsGmChoice = npcInvolved && !canPlayNpcs && gms.length > 1;

  function refreshPartnerSelection(form: HTMLFormElement | null) {
    const selected = form?.querySelectorAll<HTMLInputElement>(
      'input[name="partners"]:checked',
    );
    setSelectedPartnerKeys(
      selected ? Array.from(selected, (input) => input.value) : [],
    );
  }

  return (
    <EditorDraftForm
      action={formAction}
      className="lcars-wide-column flex flex-col gap-[16px]"
      draftScope="dialogue:new"
      newDraftType={draftOnCreate ? "dialogue" : undefined}
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
          className={characterListClass}
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
        hint="Wähle eine oder mehrere Figuren aus. Ein Gespräch kann bereits bei der Erstellung mehr als zwei Teilnehmende haben. NPCs schreibt die Spielleitung."
      >
        <fieldset
          aria-label="Gesprächspartner"
          className="max-h-[280px] overflow-y-auto rounded-lg border border-lcars-border p-[8px]"
        >
          <legend className="sr-only">Gesprächspartner</legend>
          <div className="flex flex-col gap-[2px]">
            {partnerCharacters.map((character, index) => {
              const value = speakerKey({ kind: "character", id: character.id });
              const id = index === 0 ? "dlg-partner-character" : `dlg-partner-${value}`;
              return (
                <label
                  key={value}
                  htmlFor={id}
                  className="flex min-h-[42px] cursor-pointer items-center gap-[10px] rounded-md px-[8px] py-[6px] hover:bg-lcars-surface"
                >
                  <input
                    id={id}
                    type="checkbox"
                    name="partners"
                    value={value}
                    required={selectedPartnerKeys.length === 0 && index === 0}
                    onChange={(event) =>
                      refreshPartnerSelection(event.currentTarget.form)
                    }
                    className="h-[18px] w-[18px] shrink-0"
                  />
                  <span>
                    {character.name} (gespielt von {character.playerName})
                  </span>
                </label>
              );
            })}
            {npcs.length > 0 && (
              <div className="mt-[6px] border-t border-lcars-border pt-[6px]">
                <p className="lcars-eyebrow px-[8px]">NPCs</p>
                {npcs.map((npc, index) => {
                  const value = speakerKey({ kind: "npc", id: npc.id });
                  const isFirst = partnerCharacters.length === 0 && index === 0;
                  const id = isFirst ? "dlg-partner-character" : `dlg-partner-${value}`;
                  return (
                    <label
                      key={value}
                      htmlFor={id}
                      className="flex min-h-[42px] cursor-pointer items-center gap-[10px] rounded-md px-[8px] py-[6px] hover:bg-lcars-surface"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        name="partners"
                        value={value}
                        required={selectedPartnerKeys.length === 0 && isFirst}
                        onChange={(event) =>
                          refreshPartnerSelection(event.currentTarget.form)
                        }
                        className="h-[18px] w-[18px] shrink-0"
                      />
                      <span>{npc.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {partnerCharacters.length === 0 && npcs.length === 0 && (
              <p id="dlg-partner-character" className="px-[8px] py-[10px] text-[13px] text-lcars-ink-dim">
                Keine Gesprächspartner verfügbar.
              </p>
            )}
          </div>
        </fieldset>
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
    </EditorDraftForm>
  );
}
