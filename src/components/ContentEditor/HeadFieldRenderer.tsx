import { FormField } from "@/app/users/_shared/FormPrimitives";
import type { HeadField } from "./headFields";

const inputClass = "rounded-lcars-pill lcars-input w-full";

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
          className={inputClass}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
