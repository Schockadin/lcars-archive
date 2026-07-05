import { FormField } from "../../../_shared/FormPrimitives";

export const missionLogInputClass =
  "rounded-lcars-pill lcars-input w-full sm:w-[400px]";
export const missionLogTextAreaClass =
  "rounded-lcars-pill lcars-input min-h-[500px] resize-y font-mono";

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
}: {
  idPrefix: string;
  defaults?: MissionLogDateBodyDefaults;
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
        hint="Unterstützt Markdown-Formatierung."
      >
        <textarea
          id={`${idPrefix}-body`}
          name="bodyMarkdown"
          required
          defaultValue={defaults.bodyMarkdown}
          className={missionLogTextAreaClass}
        />
      </FormField>
    </>
  );
}
