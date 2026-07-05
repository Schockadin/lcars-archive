import { FormField } from "../../../_shared/FormPrimitives";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/archiveFormat";
import type { ArchiveCategory } from "@/types/archive";

const inputClass = "rounded-lcars-pill lcars-input w-full sm:w-[400px]";
const textAreaClass =
  "rounded-lcars-pill lcars-input min-h-[400px] resize-y font-mono";

// Kategorie 'dialogue' bewusst ausgeschlossen — Gespräche haben ihr eigenes
// Anlage-/Bearbeiten-Formular (/users/[id]/dialogues/new) mit eigenem
// Daten-/Teilnehmer-Modell statt eines freien Markdown-Bodys.
const SELECTABLE_CATEGORIES = CATEGORY_ORDER.filter(
  (c) => c !== "dialogue",
) as Exclude<ArchiveCategory, "dialogue">[];

export interface ArchiveEntryFieldsDefaults {
  title?: string;
  category?: ArchiveCategory;
  tags?: string;
  bodyMarkdown?: string;
}

// Gemeinsame Feldliste von New-/EditArchiveEntryForm (Titel/Kategorie/Tags/
// Inhalt) — analog MissionFields.tsx. idPrefix hält die DOM-IDs pro
// Formular eindeutig.
export function ArchiveEntryFields({
  idPrefix,
  defaults = {},
}: {
  idPrefix: string;
  defaults?: ArchiveEntryFieldsDefaults;
}) {
  return (
    <>
      <FormField label="Titel" htmlFor={`${idPrefix}-title`}>
        <input
          id={`${idPrefix}-title`}
          name="title"
          type="text"
          required
          defaultValue={defaults.title}
          className={inputClass}
        />
      </FormField>

      <FormField label="Kategorie" htmlFor={`${idPrefix}-category`}>
        <select
          id={`${idPrefix}-category`}
          name="category"
          defaultValue={defaults.category ?? "other"}
          className={inputClass}
        >
          {SELECTABLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_CONFIG[c].label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Tags (kommagetrennt)" htmlFor={`${idPrefix}-tags`}>
        <input
          id={`${idPrefix}-tags`}
          name="tags"
          type="text"
          defaultValue={defaults.tags}
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Inhalt"
        htmlFor={`${idPrefix}-body`}
        hint="Unterstützt Markdown-Formatierung."
      >
        <textarea
          id={`${idPrefix}-body`}
          name="bodyMarkdown"
          required
          defaultValue={defaults.bodyMarkdown}
          className={textAreaClass}
        />
      </FormField>
    </>
  );
}
