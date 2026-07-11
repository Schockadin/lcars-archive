"use client";
import { useState } from "react";
import { FormField } from "@/app/_shared/FormPrimitives";
import type { CharacterParticipantOption } from "@/lib/characters";

// Natives <select multiple> (Dropdown-Multiselect) statt der vorherigen
// Checkbox-Liste — Mehrfachauswahl per Strg/Cmd- bzw. Shift-Klick, wie bei
// jedem Standard-Mehrfachauswahl-Dropdown. Alle ausgewählten <option>-Werte
// landen unter demselben name="participantCharacterIds" per
// formData.getAll("participantCharacterIds") im Server-Handler
// (missionAction, contentAction.ts) — unverändert gegenüber der
// Checkbox-Variante. Ein Klick OHNE Strg/Cmd/Shift hebt dabei die vorherige
// Auswahl auf (Standardverhalten von <select multiple>) — leicht zu
// übersehen, da es keine visuelle Warnung gibt. Der Live-Zähler unten macht
// die tatsächlich ausgewählte Anzahl sofort sichtbar, damit eine
// versehentlich verlorene Auswahl vor dem Absenden auffällt statt erst an
// einer ausgebliebenen Benachrichtigung.
export default function MissionParticipantsField({
  idPrefix,
  characters,
  defaultSelectedIds = [],
}: {
  idPrefix: string;
  characters: CharacterParticipantOption[];
  defaultSelectedIds?: number[];
}) {
  const [selectedCount, setSelectedCount] = useState(defaultSelectedIds.length);

  return (
    <FormField
      label="Teilnehmende Charaktere"
      htmlFor={`${idPrefix}-participants`}
      hint="Wer bei dieser Mission mitspielt (Mehrfachauswahl per Strg/Cmd- oder Shift-Klick — ein Klick ohne diese Taste ersetzt die bisherige Auswahl). Löst kein automatisches Abo aus — die Teilnehmer bekommen beim Anlegen stattdessen eine Benachrichtigung mit einem Link, um das Abo selbst zu aktivieren."
      className="content-editor-field--full"
    >
      {characters.length === 0 ? (
        <p
          id={`${idPrefix}-participants`}
          className="text-lcars-text-dim text-[13px] px-[12px]"
        >
          Noch keine Charaktere vorhanden.
        </p>
      ) : (
        <>
          <select
            id={`${idPrefix}-participants`}
            name="participantCharacterIds"
            multiple
            size={Math.min(8, characters.length)}
            defaultValue={defaultSelectedIds.map(String)}
            onChange={(e) =>
              setSelectedCount(
                Array.from(e.currentTarget.selectedOptions).length,
              )
            }
            className="lcars-input rounded-lcars-pill w-full h-auto py-[8px]"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.playerName ? ` (${c.playerName})` : ""}
              </option>
            ))}
          </select>
          <p className="text-lcars-text-dim text-[13px] px-[12px]">
            {selectedCount === 0
              ? "Keine Teilnehmer ausgewählt."
              : selectedCount === 1
                ? "1 Teilnehmer ausgewählt."
                : `${selectedCount} Teilnehmer ausgewählt.`}
          </p>
        </>
      )}
    </FormField>
  );
}
