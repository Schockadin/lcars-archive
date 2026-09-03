import { FormField } from "@/app/_shared/FormPrimitives";
import type { HeadField } from "./headFields";

const inputClass = "rounded-lcars-pill lcars-input w-full";
// Selects tragen durchgängig lcars-input + rounded-full (siehe die übrigen
// Auswahlfelder der App); die Textfelder daneben behalten ihren Pillen-Radius.
const selectClass = "lcars-input rounded-full w-full";

export default function HeadFieldRenderer({
  field,
  idPrefix,
  defaultValue,
}: {
  field: HeadField;
  idPrefix: string;
  defaultValue: unknown;
}) {
  const id = `${idPrefix}-${field.name}`;

  return (
    <FormField
      label={field.label}
      htmlFor={id}
      hint={field.hint}
      className={field.fullWidth ? "content-editor-field--full" : ""}
    >
      {field.kind === "select" ? (
        <select
          id={id}
          name={field.name}
          required={field.required}
          defaultValue={(defaultValue as string | undefined) ?? ""}
          className={selectClass}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.kind === "file" ? (
        // File-Inputs sind immer uncontrolled (kein defaultValue); accept
        // begrenzt nur die Auswahl im Dialog, die echte Prüfung passiert
        // serverseitig.
        <input
          id={id}
          name={field.name}
          type="file"
          required={field.required}
          accept={field.accept}
          className={`${inputClass} lcars-file-input`}
        />
      ) : (
        <input
          id={id}
          name={field.name}
          type={field.kind}
          required={field.required}
          min={field.kind === "number" ? field.min : undefined}
          placeholder={field.kind === "text" ? field.placeholder : undefined}
          defaultValue={
            (defaultValue as string | number | undefined) ?? undefined
          }
          className={inputClass}
        />
      )}
    </FormField>
  );
}
