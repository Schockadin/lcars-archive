import { FormField } from "../../../_shared/FormPrimitives";
import TimelineMarkerButton from "../../../_shared/TimelineMarkerButton";
import AutoLinkCheckbox from "../../../_shared/AutoLinkCheckbox";
import type { Character } from "@/types/character";

const inputClass = "rounded-lcars-pill lcars-input w-full sm:w-[400px]";
const textAreaClass =
  "rounded-lcars-pill lcars-input min-h-[300px] resize-y font-mono";

const STATUS_OPTIONS: { value: Character["status"]; label: string }[] = [
  { value: "active", label: "Aktiv" },
  { value: "retired", label: "Inaktiv" },
  { value: "deceased", label: "Verstorben" },
];

export interface CharacterFieldsDefaults {
  name?: string;
  status?: Character["status"];
  portrait?: string;
  rank?: string;
  species?: string;
  homeworld?: string;
  aliases?: string;
  bodyMarkdown?: string;
}

// Gemeinsame Feldliste von New-/EditCharacterForm — deckt bewusst nur die
// für einen Spieler-Charakter relevanten Metadaten-Felder ab
// (Rang/Spezies/Heimatwelt/Aliase); Alter/Fraktion/Generation bleiben
// admin-only Ingest-Domäne (siehe createCharacter in src/lib/characters.ts).
export function CharacterFields({
  idPrefix,
  defaults = {},
  isAdminOrGM = false,
}: {
  idPrefix: string;
  defaults?: CharacterFieldsDefaults;
  // Wie bei ArchiveEntryFields.tsx: die Selbstanlage/-bearbeitung eines
  // Charakters ist nicht rollen-gebunden, der Timeline-Marker-Button muss
  // deshalb explizit auf die tatsächliche Rolle geprüft werden.
  isAdminOrGM?: boolean;
}) {
  return (
    <>
      <FormField label="Name" htmlFor={`${idPrefix}-name`}>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          required
          defaultValue={defaults.name}
          className={inputClass}
        />
      </FormField>

      <FormField label="Status" htmlFor={`${idPrefix}-status`}>
        <select
          id={`${idPrefix}-status`}
          name="status"
          defaultValue={defaults.status ?? "active"}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Portrait-URL (optional)" htmlFor={`${idPrefix}-portrait`}>
        <input
          id={`${idPrefix}-portrait`}
          name="portrait"
          type="text"
          defaultValue={defaults.portrait}
          className={inputClass}
        />
      </FormField>

      <FormField label="Spezies (kommagetrennt)" htmlFor={`${idPrefix}-species`}>
        <input
          id={`${idPrefix}-species`}
          name="species"
          type="text"
          defaultValue={defaults.species}
          className={inputClass}
        />
      </FormField>

      <FormField label="Rang (optional)" htmlFor={`${idPrefix}-rank`}>
        <input
          id={`${idPrefix}-rank`}
          name="rank"
          type="text"
          defaultValue={defaults.rank}
          className={inputClass}
        />
      </FormField>

      <FormField label="Heimatwelt (optional)" htmlFor={`${idPrefix}-homeworld`}>
        <input
          id={`${idPrefix}-homeworld`}
          name="homeworld"
          type="text"
          defaultValue={defaults.homeworld}
          className={inputClass}
        />
      </FormField>

      <FormField label="Aliase (kommagetrennt)" htmlFor={`${idPrefix}-aliases`}>
        <input
          id={`${idPrefix}-aliases`}
          name="aliases"
          type="text"
          defaultValue={defaults.aliases}
          className={inputClass}
        />
      </FormField>

      {isAdminOrGM && <TimelineMarkerButton textareaId={`${idPrefix}-body`} />}

      <FormField
        label="Biografie (optional)"
        htmlFor={`${idPrefix}-body`}
        hint="Unterstützt Markdown-Formatierung."
      >
        <textarea
          id={`${idPrefix}-body`}
          name="bodyMarkdown"
          defaultValue={defaults.bodyMarkdown}
          className={textAreaClass}
        />
      </FormField>

      <AutoLinkCheckbox idPrefix={idPrefix} />
    </>
  );
}
