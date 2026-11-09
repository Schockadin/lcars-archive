import type { HeadField } from "@/components/ContentEditor/headFields";
import {
  CharacterField,
  CharacterFileInput,
  CharacterSelectInput,
  CharacterTextInput,
} from "./CharacterFormControls";

const HEAD_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  status: "Status",
  rank: "Rank",
  homeworld: "Homeworld",
  aliases: "Aliases",
  dateOfBirth: "Date of Birth",
  age: "Age",
  generation: "Generation",
  factions: "Factions",
  ships: "Ships",
  division: "Division",
  tags: "Tags",
};

export default function CharacterHeadFieldRenderer({
  field,
  idPrefix,
  defaultValue,
}: {
  field: HeadField;
  idPrefix: string;
  defaultValue: unknown;
}) {
  const id = `${idPrefix}-${field.name}`;
  const englishLabel = HEAD_FIELD_LABELS[field.name] ?? field.label;
  const safeDefaultValue =
    typeof defaultValue === "string" || typeof defaultValue === "number"
      ? defaultValue
      : "";

  return (
    <CharacterField
      label={englishLabel}
      secondary={field.label}
      hint={field.hint}
      className={field.fullWidth ? "content-editor-field--full" : ""}
    >
      {field.kind === "select" ? (
        <CharacterSelectInput
          id={id}
          name={field.name}
          defaultValue={String(safeDefaultValue)}
          options={field.options}
          required={field.required}
        />
      ) : field.kind === "file" ? (
        <CharacterFileInput
          id={id}
          name={field.name}
          accept={field.accept}
          required={field.required}
        />
      ) : (
        <CharacterTextInput
          id={id}
          name={field.name}
          defaultValue={safeDefaultValue}
          placeholder={field.kind === "text" ? field.placeholder : undefined}
          type={field.kind}
          min={field.kind === "number" ? field.min : undefined}
          required={field.required}
        />
      )}
    </CharacterField>
  );
}
