export type JsonRootType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

export function jsonRootType(value: unknown): JsonRootType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  return "boolean";
}

export type JsonEditResult = { value: unknown } | { error: string };

// JSON cells are edited as JSON text. Metadata/frontmatter have application
// semantics as objects; storing a serialized object as a JSON string silently
// makes those records disappear from readers that expect object properties.
export function parseJsonEditValue(
  column: string,
  input: string,
  expectedRootType?: JsonRootType,
): JsonEditResult {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    return { error: `Die Spalte „${column}“ enthält kein gültiges JSON.` };
  }

  if (
    (column === "metadata" || column === "frontmatter") &&
    (value === null || Array.isArray(value) || typeof value !== "object")
  ) {
    return {
      error: `Die Spalte „${column}“ muss ein JSON-Objekt enthalten. Entferne äußere Anführungszeichen um das Objekt.`,
    };
  }

  if (expectedRootType && jsonRootType(value) !== expectedRootType) {
    return {
      error: `Die Spalte „${column}“ muss weiterhin denselben JSON-Wurzeltyp („${expectedRootType}“) enthalten.`,
    };
  }

  return { value };
}
