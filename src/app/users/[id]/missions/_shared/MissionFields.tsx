import { FormField } from "../../../_shared/FormPrimitives";
import AutoLinkCheckbox from "../../../_shared/AutoLinkCheckbox";
import MarkdownEditor from "../../../_shared/MarkdownEditor";
import { MarkdownFormatHint } from "../../../_shared/MarkdownHint";
import type { MissionStatus } from "@/types/missions";

const inputClass = "rounded-lcars-pill lcars-input w-full sm:w-[400px]";

const STATUS_OPTIONS: { value: MissionStatus; label: string }[] = [
  { value: "active", label: "Aktiv" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "failed", label: "Gescheitert" },
  { value: "abandoned", label: "Abgebrochen" },
];

export interface MissionFieldsDefaults {
  title?: string;
  status?: MissionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  tags?: string;
  bodyMarkdown?: string;
}

// Gemeinsame Feldliste von New-/EditMissionForm (Titel/Status/Start/Ende/
// Tags/Zusammenfassung) — vorher in beiden Formularen dupliziert, nur das
// Slug-Feld ist Anlegen-exklusiv (showSlugField). idPrefix hält die
// DOM-IDs pro Formular eindeutig ("mission" vs. "edit-mission", identisch
// zu den vorherigen, direkt in den Formularen fest verdrahteten IDs).
export function MissionFields({
  idPrefix,
  defaults = {},
  showSlugField = false,
}: {
  idPrefix: string;
  defaults?: MissionFieldsDefaults;
  showSlugField?: boolean;
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

      {showSlugField && (
        <FormField
          label="Slug (optional)"
          htmlFor={`${idPrefix}-slug`}
          hint="Bestimmt die URL der Mission. Bleibt das Feld leer, wird der Slug aus dem Titel abgeleitet."
        >
          <input
            id={`${idPrefix}-slug`}
            name="slug"
            type="text"
            className={inputClass}
          />
        </FormField>
      )}

      <FormField label="Status" htmlFor={`${idPrefix}-status`}>
        <select
          id={`${idPrefix}-status`}
          name="status"
          defaultValue={defaults.status ?? "active"}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Start" htmlFor={`${idPrefix}-started`}>
        <input
          id={`${idPrefix}-started`}
          name="startedAt"
          type="date"
          defaultValue={defaults.startedAt ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Ende (optional)" htmlFor={`${idPrefix}-ended`}>
        <input
          id={`${idPrefix}-ended`}
          name="endedAt"
          type="date"
          defaultValue={defaults.endedAt ?? ""}
          className={inputClass}
        />
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
        label="Zusammenfassung"
        htmlFor={`${idPrefix}-body`}
        hint={<MarkdownFormatHint />}
      >
        {/* isAdminOrGM fest true — MissionFields wird ausschließlich von
            New-/EditMissionForm gerendert, beide bereits per requireOwnGM
            (page.tsx) auf gm/admin beschränkt. */}
        <MarkdownEditor
          id={`${idPrefix}-body`}
          required
          defaultValue={defaults.bodyMarkdown}
          isAdminOrGM
          large
        />
      </FormField>

      <AutoLinkCheckbox idPrefix={idPrefix} />
    </>
  );
}
