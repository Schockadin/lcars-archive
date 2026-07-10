import { FormField } from "@/app/_shared/FormPrimitives";
import type { CharacterParticipantOption } from "@/lib/characters";

// Checkbox-Multiselect statt eines nativen <select multiple> — bessere
// Bedienbarkeit (kein Strg/Cmd-Klicken nötig) und passt zum übrigen
// LCARS-Formular-Stil (vgl. AutoLinkCheckbox.tsx). Alle gleichnamigen
// Checkboxen (name="participantCharacterIds") landen per
// formData.getAll("participantCharacterIds") im Server-Handler
// (missionAction, contentAction.ts). Kein eigener Client-State nötig — reine
// unkontrollierte Checkboxen, defaultChecked genügt fürs Edit-Vorbelegen.
export default function MissionParticipantsField({
  idPrefix,
  characters,
  defaultSelectedIds = [],
}: {
  idPrefix: string;
  characters: CharacterParticipantOption[];
  defaultSelectedIds?: number[];
}) {
  const selected = new Set(defaultSelectedIds);

  return (
    <FormField
      label="Teilnehmende Charaktere"
      htmlFor={`${idPrefix}-participants`}
      hint="Wer bei dieser Mission mitspielt. Löst kein automatisches Abo aus — die Teilnehmer bekommen beim Anlegen stattdessen eine Benachrichtigung mit einem Link, um das Abo selbst zu aktivieren."
      className="content-editor-field--full"
    >
      <div
        id={`${idPrefix}-participants`}
        className="flex flex-col gap-[4px] max-h-[240px] overflow-y-auto rounded-lcars-pill lcars-input py-[8px]"
      >
        {characters.length === 0 ? (
          <p className="text-lcars-text-dim text-[13px] px-[12px]">
            Noch keine Charaktere vorhanden.
          </p>
        ) : (
          characters.map((c) => {
            const id = `${idPrefix}-participant-${c.id}`;
            return (
              <div key={c.id} className="flex items-center gap-[8px] px-[12px]">
                <input
                  id={id}
                  name="participantCharacterIds"
                  type="checkbox"
                  value={c.id}
                  defaultChecked={selected.has(c.id)}
                  className="h-[16px] w-[16px] shrink-0"
                />
                <label htmlFor={id} className="lcars-text text-[14px]">
                  {c.name}
                  {c.playerName && (
                    <span className="text-lcars-text-dim"> ({c.playerName})</span>
                  )}
                </label>
              </div>
            );
          })
        )}
      </div>
    </FormField>
  );
}
