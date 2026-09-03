"use client";
import { useActionState, useState } from "react";
import HeadFieldRenderer from "@/components/ContentEditor/HeadFieldRenderer";
import { SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import CharacterPanel from "./CharacterPanel";
import {
  updateCharacterHeadAction,
  type CharacterPanelState,
} from "../_shared/panelActions";
import {
  characterHeadFields,
  characterMetadataFields,
} from "../_shared/characterHeadFields";
import type { OwnCharacterForEdit } from "@/lib/characters";

const initialState: CharacterPanelState = {};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  retired: "Inaktiv",
  deceased: "Verstorben",
};

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="stat-editor-field">
      <span className="stat-field-label">
        <span className="stat-label-secondary">{label}</span>
      </span>
      <span className="lcars-text">{value}</span>
    </div>
  );
}

// Panel „Stammdaten" der eigenen Charakterseite: normalerweise eine
// Übersicht, per Stift-Knopf wird daraus dasselbe Formular wie früher unter
// /edit. Gespeichert wird nur dieser Teil — Biografie und Werte haben ihre
// eigenen Panels (siehe panelActions.ts).
export default function CharacterHeadPanel({
  userId,
  character,
}: {
  userId: number;
  character: OwnCharacterForEdit;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateCharacterHeadAction,
    initialState,
  );

  // Nach einem erfolgreichen Speichern zurück in die Übersicht — die Seite
  // selbst lädt durch revalidatePath frisch, das Panel muss die Werte also
  // nicht nachhalten. Verglichen wird das Action-Ergebnis selbst (nicht nur
  // sein success-Feld): sonst schlösse ein späteres Öffnen des Formulars
  // sofort wieder, weil die alte Erfolgsmeldung noch im State steht.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) setEditing(false);
  }

  const list = (entries: string[]) =>
    entries.length > 0 ? entries.join(", ") : null;

  return (
    <CharacterPanel
      en="Personnel Record"
      de="Stammdaten"
      editing={editing}
      onToggleEdit={() => setEditing((v) => !v)}
      editLabel="Stammdaten bearbeiten"
    >
      <div className="stat-editor-body">
        {!editing ? (
          <>
            <div className="stat-editor-grid">
              <Row label="Name" value={character.name} />
              <Row
                label="Status"
                value={STATUS_LABELS[character.status] ?? character.status}
              />
              <Row label="Rang" value={character.rank} />
              <Row label="Spezies" value={list(character.species)} />
              <Row label="Heimatwelt" value={character.homeworld} />
              <Row label="Aliase" value={list(character.aliases)} />
              <Row label="Geburtsdatum" value={character.dateOfBirth} />
              <Row
                label="Alter"
                value={character.age === null ? null : String(character.age)}
              />
              <Row
                label="Generation"
                value={list(character.generation.map(String))}
              />
              <Row label="Fraktionen" value={list(character.factions)} />
              <Row label="Schiffe" value={list(character.ships)} />
              <Row label="Division" value={character.division} />
              <Row label="Tags" value={list(character.tags)} />
            </div>
            {character.isDraft && (
              <p className="stat-sheet-rule">
                Entwurf — außer dir sieht diesen Charakter niemand.
              </p>
            )}
          </>
        ) : (
          <form action={formAction} className="flex flex-col gap-[16px]">
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="characterId" value={character.id} />

            <div className="content-editor-head-grid">
              {[...characterHeadFields, ...characterMetadataFields].map(
                (field) => (
                  <HeadFieldRenderer
                    key={field.name}
                    field={field}
                    idPrefix="head-panel"
                    defaultValue={
                      (
                        {
                          name: character.name,
                          status: character.status,
                          portrait: character.portrait ?? undefined,
                          rank: character.rank ?? undefined,
                          species: character.species.join(", "),
                          homeworld: character.homeworld ?? undefined,
                          aliases: character.aliases.join(", "),
                          age: character.age ?? undefined,
                          dateOfBirth: character.dateOfBirth ?? undefined,
                          generation: character.generation.join(", "),
                          factions: character.factions.join(", "),
                          ships: character.ships.join(", "),
                          division: character.division ?? undefined,
                          tags: character.tags.join(", "),
                        } as Record<string, unknown>
                      )[field.name]
                    }
                  />
                ),
              )}
            </div>

            <div className="flex items-center gap-[8px]">
              <input
                id="head-panel-is-draft"
                name="isDraft"
                type="checkbox"
                defaultChecked={character.isDraft}
                className="h-[16px] w-[16px]"
              />
              <label
                htmlFor="head-panel-is-draft"
                className="lcars-text text-[14px]"
              >
                Als Entwurf behalten (sichtbar nur für dich)
              </label>
            </div>

            <SubmitButton
              pending={pending}
              pendingLabel="Wird gespeichert…"
              className="lcars-pill-btn--outline self-start disabled:opacity-50"
            >
              Stammdaten speichern
            </SubmitButton>
          </form>
        )}

        <FormError message={state?.error} />
      </div>
    </CharacterPanel>
  );
}
