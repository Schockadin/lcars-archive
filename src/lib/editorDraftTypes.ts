export const EDITOR_DRAFT_TYPES = ["archive", "mission", "mission_log"] as const;
export type EditorDraftType = (typeof EDITOR_DRAFT_TYPES)[number];
export type EditorDraftValue = string | boolean | string[];
export type EditorDraftFields = Record<string, EditorDraftValue>;

const EDITOR_DRAFT_MAX_BYTES = 500_000;
const EDITOR_DRAFT_MAX_FIELDS = 300;
const EDITOR_DRAFT_MAX_VALUE_LENGTH = 200_000;

export function isEditorDraftType(value: unknown): value is EditorDraftType {
  return (
    typeof value === "string" &&
    EDITOR_DRAFT_TYPES.includes(value as EditorDraftType)
  );
}

export function validateEditorDraftFields(
  value: unknown,
): EditorDraftFields | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > EDITOR_DRAFT_MAX_FIELDS) return null;

  const fields: EditorDraftFields = {};
  for (const [key, fieldValue] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(key)) return null;
    if (typeof fieldValue === "string") {
      if (fieldValue.length > EDITOR_DRAFT_MAX_VALUE_LENGTH) return null;
      fields[key] = fieldValue;
    } else if (typeof fieldValue === "boolean") {
      fields[key] = fieldValue;
    } else if (
      Array.isArray(fieldValue) &&
      fieldValue.length <= EDITOR_DRAFT_MAX_FIELDS &&
      fieldValue.every(
        (item) =>
          typeof item === "string" &&
          item.length <= EDITOR_DRAFT_MAX_VALUE_LENGTH,
      )
    ) {
      fields[key] = fieldValue as string[];
    } else {
      return null;
    }
  }

  if (
    new TextEncoder().encode(JSON.stringify(fields)).byteLength >
    EDITOR_DRAFT_MAX_BYTES
  ) {
    return null;
  }
  return fields;
}
