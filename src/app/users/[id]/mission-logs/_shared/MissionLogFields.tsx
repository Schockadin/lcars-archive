import { FormField } from "../../../_shared/FormPrimitives";
import AutoLinkCheckbox from "../../../_shared/AutoLinkCheckbox";
import MarkdownEditor from "../../../_shared/MarkdownEditor";
import { MarkdownFormatHint } from "../../../_shared/MarkdownHint";

export const missionLogInputClass =
  "rounded-lcars-pill lcars-input w-full sm:w-[400px]";

// Aufgeteilt in zwei Stücke statt einer Feldliste, weil NewMissionLogForm
// zwischen Titel und Datum/Log-Text noch die Session-Nr einschiebt (Edit
// dagegen zeigt Titel/Datum/Log-Text direkt hintereinander) — eine
// gemeinsame Komponente für alle drei Felder würde die Feldreihenfolge in
// NewMissionLogForm unbemerkt verschieben.

export function MissionLogTitleField({
  idPrefix,
  defaultValue,
}: {
  idPrefix: string;
  defaultValue?: string;
}) {
  return (
    <FormField label="Titel" htmlFor={`${idPrefix}-title`}>
      <input
        id={`${idPrefix}-title`}
        name="title"
        type="text"
        required
        defaultValue={defaultValue}
        className={missionLogInputClass}
      />
    </FormField>
  );
}

export interface MissionLogDateBodyDefaults {
  logDate?: string | null;
  bodyMarkdown?: string;
}

export function MissionLogDateBodyFields({
  idPrefix,
  defaults = {},
  isAdminOrGM = false,
}: {
  idPrefix: string;
  defaults?: MissionLogDateBodyDefaults;
  // Anders als MissionFields.tsx (immer gm/admin-gated) dürfen Missionslogs
  // von jedem User mit eigenem Charakter angelegt werden — der
  // Timeline-Marker-Button muss deshalb explizit auf die tatsächliche Rolle
  // geprüft werden statt implizit vorausgesetzt zu werden.
  isAdminOrGM?: boolean;
}) {
  return (
    <>
      <FormField label="Datum" htmlFor={`${idPrefix}-date`}>
        <input
          id={`${idPrefix}-date`}
          name="logDate"
          type="date"
          defaultValue={defaults.logDate ?? ""}
          className={missionLogInputClass}
        />
      </FormField>

      <FormField
        label="Log-Text"
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
