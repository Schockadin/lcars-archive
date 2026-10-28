export interface StaEditorCharacterData {
  name: string;
  species: string;
  profession: string;
  concept: string;
  upbringing: string;
  career: string;
  rank: string;
  creationMethod: "points" | "ap";
  attributes: Record<string, number>;
  disciplines: Record<string, number>;
  values: string[];
  talents: string[];
  focuses: string[];
  notes: string;
  customFields: Record<string, string>;
}

export interface StaEditorModulePack {
  manifest: {
    schemaVersion: 1;
    id: string;
    version: string;
    title: string;
    description?: string;
  };
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean);
}

function numberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).slice(0, 40);
  const result: Record<string, number> = {};
  for (const [key, raw] of entries) {
    if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(key)) continue;
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 15) continue;
    result[key] = raw;
  }
  return result;
}

export function sanitizeStaEditorCharacter(value: unknown): StaEditorCharacterData | null {
  if (!isRecord(value)) return null;
  const name = text(value.name, 100);
  if (!name) return null;
  const method = value.creationMethod === "ap" ? "ap" : "points";
  const customFields: Record<string, string> = {};
  if (isRecord(value.customFields)) {
    for (const [key, item] of Object.entries(value.customFields).slice(0, 50)) {
      // Custom field keys include both a module ID and a field ID.
      if (/^[a-z0-9][a-z0-9._-]{0,160}$/i.test(key) && typeof item === "string") {
        customFields[key] = item.trim().slice(0, 2000);
      }
    }
  }
  return {
    name,
    species: text(value.species, 80),
    profession: text(value.profession, 100),
    concept: text(value.concept, 120),
    upbringing: text(value.upbringing, 120),
    career: text(value.career, 120),
    rank: text(value.rank, 80),
    creationMethod: method,
    attributes: numberMap(value.attributes),
    disciplines: numberMap(value.disciplines),
    values: stringList(value.values, 100, 120),
    talents: stringList(value.talents, 100, 120),
    focuses: stringList(value.focuses, 100, 120),
    notes: text(value.notes, 10_000),
    customFields,
  };
}

function checkDeclarativeOnly(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (Array.isArray(value)) return value.length <= 1000 && value.every((item) => checkDeclarativeOnly(item, depth + 1));
  if (!isRecord(value)) return typeof value !== "function";
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:code|script|javascript|executable)$/i.test(key) || /^on[a-z]+$/i.test(key)) return false;
    if (!checkDeclarativeOnly(child, depth + 1)) return false;
  }
  return true;
}

function validateEntries(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 300) return false;
  return value.every((entry) => {
    if (!isRecord(entry)) return typeof entry === "string" && entry.length <= 120;
    const id = entry.id;
    const label = entry.name ?? entry.label;
    return typeof id === "string" && /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(id) &&
      (label === undefined || (typeof label === "string" && label.trim().length <= 120));
  });
}

export function validateStaEditorModulePack(value: unknown): StaEditorModulePack | null {
  if (!isRecord(value) || !checkDeclarativeOnly(value)) return null;
  const manifest = value.manifest;
  if (!isRecord(manifest) || manifest.schemaVersion !== 1) return null;
  if (typeof manifest.id !== "string" || !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(manifest.id)) return null;
  if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) return null;
  if (typeof manifest.title !== "string" || !manifest.title.trim() || manifest.title.length > 120) return null;
  if (manifest.description !== undefined && (typeof manifest.description !== "string" || manifest.description.length > 1000)) return null;
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 1_000_000) return null;
  for (const key of ["attributes", "disciplines", "species", "professions", "classes"]) {
    if (!validateEntries(value[key])) return null;
  }
  if (value.characterFields !== undefined) {
    if (!Array.isArray(value.characterFields) || value.characterFields.length > 100) return null;
    for (const field of value.characterFields) {
      if (!isRecord(field) || typeof field.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(field.id) ||
          typeof field.label !== "string" || field.label.length > 120 ||
          !["text", "number", "multiline", "select"].includes(String(field.type))) return null;
      if (field.type === "select") {
        if (!Array.isArray(field.options) || field.options.length > 100 || field.options.some((option) => {
          if (typeof option === "string") return option.length > 120;
          return !isRecord(option) || typeof option.value !== "string" || option.value.length > 120 ||
            typeof option.label !== "string" || option.label.length > 120;
        })) return null;
      }
    }
  }
  if (value.creationRules !== undefined) {
    if (!isRecord(value.creationRules)) return null;
    const methods = value.creationRules.methods;
    if (methods !== undefined && (!Array.isArray(methods) || methods.length === 0 || methods.some((method) => method !== "points" && method !== "ap"))) return null;
    const defaultMethod = value.creationRules.defaultMethod;
    if (defaultMethod !== undefined && defaultMethod !== "points" && defaultMethod !== "ap") return null;
    for (const key of ["points", "ap", "freeCounts"]) {
      const ruleset = value.creationRules[key];
      if (ruleset === undefined) continue;
      if (!isRecord(ruleset) || Object.values(ruleset).some((amount) => typeof amount !== "number" || !Number.isInteger(amount) || amount < 0 || amount > 100_000)) return null;
    }
    const limits = value.creationRules.limits;
    if (limits !== undefined) {
      if (!isRecord(limits)) return null;
      for (const rule of Object.values(limits)) {
        if (!isRecord(rule) || Object.values(rule).some((amount) => typeof amount !== "number" || !Number.isInteger(amount) || amount < 0 || amount > 15)) return null;
      }
    }
  }
  return value as StaEditorModulePack;
}
