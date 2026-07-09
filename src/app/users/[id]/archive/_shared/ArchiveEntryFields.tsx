import { FormField } from "../../../_shared/FormPrimitives";
import AutoLinkCheckbox from "../../../_shared/AutoLinkCheckbox";
import MarkdownEditor from "../../../_shared/MarkdownEditor";
import { MarkdownFormatHint } from "../../../_shared/MarkdownHint";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/archiveFormat";
import type { ArchiveCategory } from "@/types/archive";

const inputClass = "rounded-lcars-pill lcars-input w-full sm:w-[400px]";

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
  isAdminOrGM = false,
}: {
  idPrefix: string;
  defaults?: ArchiveEntryFieldsDefaults;
  // Archiv-Einträge dürfen von jedem User angelegt werden (siehe
  // requireOwnUser in archive/new/page.tsx) — der Timeline-Marker-Button
  // muss deshalb explizit auf die tatsächliche Rolle geprüft werden, anders
  // als bei MissionFields.tsx (immer gm/admin-gated).
  isAdminOrGM?: boolean;
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

      <FormField label="Archiv-Kategorie" htmlFor={`${idPrefix}-category`}>
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
        hint={<MarkdownFormatHint />}
      >
        <MarkdownEditor
          id={`${idPrefix}-body`}
          required
          defaultValue={defaults.bodyMarkdown}
          isAdminOrGM={isAdminOrGM}
          large
        />
      </FormField>

      <AutoLinkCheckbox idPrefix={idPrefix} />
    </>
  );
}
