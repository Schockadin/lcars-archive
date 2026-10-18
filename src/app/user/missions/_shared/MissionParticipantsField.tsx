"use client";
import { useState } from "react";
import { FormField } from "@/app/_shared/FormPrimitives";
import type { CharacterParticipantOption } from "@/lib/characters";

export default function MissionParticipantsField({
  idPrefix,
  characters,
  defaultSelectedIds = [],
}: {
  idPrefix: string;
  characters: CharacterParticipantOption[];
  defaultSelectedIds?: number[];
}) {
  const [selectedIds, setSelectedIds] = useState(defaultSelectedIds);
  const [showAll, setShowAll] = useState(false);

  // Inaktive, bereits ausgewählte Figuren bleiben beim Filtern sichtbar.
  const visibleCharacters = characters.filter(
    (character) =>
      showAll ||
      character.status === "active" ||
      selectedIds.includes(character.id),
  );

  function refreshSelectedIds(form: HTMLFormElement | null) {
    const selected = form?.querySelectorAll<HTMLInputElement>(
      'input[name="participantCharacterIds"]:checked',
    );
    setSelectedIds(
      selected
        ? Array.from(selected, (input) => Number(input.value)).filter(Number.isSafeInteger)
        : [],
    );
  }

  return (
    <FormField
      label="Teilnehmende Charaktere"
      htmlFor={`${idPrefix}-participant-${visibleCharacters[0]?.id ?? "empty"}`}
      hint="Tippe oder klicke auf die Kästchen, um Figuren hinzuzufügen oder abzuwählen. Das löst kein automatisches Abo aus — die Teilnehmenden bekommen beim Anlegen stattdessen einen Link, um das Abo selbst zu aktivieren."
      className="content-editor-field--full"
    >
      {characters.length === 0 ? (
        <p
          id={`${idPrefix}-participants`}
          className="text-lcars-ink-dim text-[13px] px-[12px]"
        >
          Noch keine Charaktere vorhanden.
        </p>
      ) : (
        <>
          <fieldset
            aria-label="Teilnehmende Charaktere"
            className="max-h-[280px] overflow-y-auto rounded-lg border border-lcars-border p-[8px]"
          >
            <legend className="sr-only">Teilnehmende Charaktere</legend>
            {visibleCharacters.length > 0 ? (
              <div className="flex flex-col gap-[2px]">
                {visibleCharacters.map((character) => (
                  <label
                    key={character.id}
                    htmlFor={`${idPrefix}-participant-${character.id}`}
                    className="flex min-h-[42px] cursor-pointer items-center gap-[10px] rounded-md px-[8px] py-[6px] hover:bg-lcars-surface"
                  >
                    <input
                      id={`${idPrefix}-participant-${character.id}`}
                      type="checkbox"
                      name="participantCharacterIds"
                      value={character.id}
                      defaultChecked={defaultSelectedIds.includes(character.id)}
                      onChange={(event) => {
                        refreshSelectedIds(event.currentTarget.form);
                      }}
                      className="h-[18px] w-[18px] shrink-0"
                    />
                    <span>
                      {character.name} ({character.playerName})
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="px-[8px] py-[10px] text-[13px] text-lcars-ink-dim">
                Keine aktiven Figuren vorhanden.
              </p>
            )}
          </fieldset>
          <label className="flex min-h-[40px] items-center gap-[8px] px-[8px] text-[13px] text-lcars-ink-dim">
            <input
              type="checkbox"
              name="showAllParticipantCharacters"
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
              className="h-[18px] w-[18px] shrink-0"
            />
            Alle Charaktere anzeigen (auch inaktive)
          </label>
          <p className="text-lcars-ink-dim text-[13px] px-[8px]" aria-live="polite">
            {selectedIds.length === 0
              ? "Keine Teilnehmer ausgewählt."
              : selectedIds.length === 1
                ? "1 Teilnehmer ausgewählt."
                : `${selectedIds.length} Teilnehmer ausgewählt.`}
          </p>
        </>
      )}
    </FormField>
  );
}
