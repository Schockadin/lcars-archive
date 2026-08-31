// Feldkatalog + Normalisierung der Charakterwerte (siehe
// src/types/characterStats.ts). Nach dem Vorbild von archiveMetadataFields.ts:
// eine einzige deklarative Feldliste, aus der sich Formular (Rendern +
// Einlesen), Anzeige und Validierung speisen — so kann kein Feld an einer der
// drei Stellen vergessen werden.
//
// Bewusst OHNE "server-only": dieselbe Registry nutzen die Server-Action
// (Einlesen/Validieren) und die Client-Komponenten (Labels/Anzeige).
import type {
  CharacterAttributes,
  CharacterDepartments,
  CharacterExperience,
  CharacterStats,
} from "@/types/characterStats";

// Labels: deutsches Label mit dem englischen Begriff des offiziellen Bogens in
// Klammern — die Spielrunde nutzt beides gemischt (siehe Beispielbogen).
export interface StatFieldSpec<K> {
  key: K;
  label: string;
}

export interface NumberFieldSpec<K> extends StatFieldSpec<K> {
  min: number;
  max: number;
}

export const ATTRIBUTE_FIELDS: NumberFieldSpec<keyof CharacterAttributes>[] = [
  { key: "control", label: "Kontrolle (Control)", min: 0, max: 20 },
  { key: "daring", label: "Wagemut (Daring)", min: 0, max: 20 },
  { key: "fitness", label: "Fitness", min: 0, max: 20 },
  { key: "insight", label: "Einsicht (Insight)", min: 0, max: 20 },
  { key: "presence", label: "Präsenz (Presence)", min: 0, max: 20 },
  { key: "reason", label: "Verstand (Reason)", min: 0, max: 20 },
];

export const DEPARTMENT_FIELDS: NumberFieldSpec<keyof CharacterDepartments>[] = [
  { key: "command", label: "Kommando (Command)", min: 0, max: 10 },
  { key: "conn", label: "Steuerung (Conn)", min: 0, max: 10 },
  { key: "engineering", label: "Technik (Engineering)", min: 0, max: 10 },
  { key: "security", label: "Sicherheit (Security)", min: 0, max: 10 },
  { key: "medicine", label: "Medizin (Medicine)", min: 0, max: 10 },
  { key: "science", label: "Wissenschaft (Science)", min: 0, max: 10 },
];

// Einzelne Zahlenwerte außerhalb von Attributen/Disziplinen.
type ScalarNumberKey = "reputation" | "stress" | "resistance" | "determination";

export const SCALAR_NUMBER_FIELDS: NumberFieldSpec<ScalarNumberKey>[] = [
  { key: "stress", label: "Stress", min: 0, max: 50 },
  { key: "resistance", label: "Widerstand (Resistance)", min: 0, max: 20 },
  // Der Bogen hat genau drei Determinationskästchen.
  { key: "determination", label: "Entschlossenheit (Determination)", min: 0, max: 3 },
  { key: "reputation", label: "Ansehen (Reputation)", min: 0, max: 50 },
];

// Freitext-Kopffelder. Name/Rang/Spezies fehlen hier bewusst — die stehen
// bereits am Charakter selbst (siehe characterHeadFields.ts).
type TextKey =
  | "pronouns"
  | "characterRole"
  | "assignment"
  | "environment"
  | "upbringing"
  | "careerPath"
  | "traits";

export const TEXT_FIELDS: StatFieldSpec<TextKey>[] = [
  { key: "pronouns", label: "Pronomen" },
  { key: "characterRole", label: "Rolle (Character Role)" },
  { key: "assignment", label: "Zuweisung (Assignment)" },
  { key: "environment", label: "Herkunft (Environment)" },
  { key: "upbringing", label: "Erziehung (Upbringing)" },
  { key: "careerPath", label: "Laufbahn (Career Path)" },
  { key: "traits", label: "Merkmale (Traits)" },
];

export const EXPERIENCE_OPTIONS: { value: CharacterExperience; label: string }[] =
  [
    { value: "novice", label: "Neuling (Novice)" },
    { value: "experienced", label: "Erfahren (Experienced)" },
    { value: "veteran", label: "Veteran" },
  ];

const EXPERIENCE_VALUES = EXPERIENCE_OPTIONS.map((o) => o.value);

export function isCharacterExperience(
  value: string,
): value is CharacterExperience {
  return (EXPERIENCE_VALUES as string[]).includes(value);
}

// Listenfelder — je Zeile ein Eintrag (der Bogen hat dafür mehrzeilige Kästen).
type ListKey =
  | "careerEvents"
  | "values"
  | "focuses"
  | "talents"
  | "pastimes"
  | "attacks"
  | "speciesAbilities"
  | "specialRules"
  | "equipment";

export const LIST_FIELDS: StatFieldSpec<ListKey>[] = [
  { key: "careerEvents", label: "Karriere-Ereignisse (Career Events)" },
  { key: "values", label: "Werte (Values)" },
  { key: "focuses", label: "Schwerpunkte (Focuses)" },
  { key: "talents", label: "Talente (Talents)" },
  { key: "speciesAbilities", label: "Spezies-Fähigkeiten (Species Ability)" },
  { key: "specialRules", label: "Sonderregeln (Special Rules)" },
  { key: "attacks", label: "Angriffe (Attacks)" },
  { key: "equipment", label: "Ausrüstung (Other Equipment)" },
  { key: "pastimes", label: "Hobbys (Pastimes)" },
];

export const EMPTY_CHARACTER_STATS: CharacterStats = {
  pronouns: null,
  characterRole: null,
  assignment: null,
  environment: null,
  upbringing: null,
  careerPath: null,
  experience: null,
  traits: null,
  careerEvents: [],
  reputation: null,
  attributes: {
    control: null,
    daring: null,
    fitness: null,
    insight: null,
    presence: null,
    reason: null,
  },
  departments: {
    command: null,
    conn: null,
    engineering: null,
    security: null,
    medicine: null,
    science: null,
  },
  stress: null,
  resistance: null,
  determination: null,
  values: [],
  focuses: [],
  talents: [],
  pastimes: [],
  attacks: [],
  speciesAbilities: [],
  specialRules: [],
  equipment: [],
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

// Zahl nur übernehmen, wenn sie ganzzahlig und im erlaubten Bereich liegt —
// alles andere (Strings aus Alt-/Fremddaten, NaN, Ausreißer) wird zu null,
// statt einen kaputten Wert bis in die Anzeige durchzureichen.
function normalizeNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const num = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof num !== "number" || !Number.isInteger(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// Tolerante Normalisierung beliebiger jsonb-Daten auf die vollständige
// CharacterStats-Form: fehlende/kaputte Felder werden zu null bzw. [], nie zu
// undefined — die Anzeige und das Formular können sich so auf jedes Feld
// verlassen, ohne selbst zu prüfen.
export function parseCharacterStats(raw: unknown): CharacterStats {
  const source = asRecord(raw);
  const attributesSource = asRecord(source.attributes);
  const departmentsSource = asRecord(source.departments);

  const attributes = { ...EMPTY_CHARACTER_STATS.attributes };
  for (const field of ATTRIBUTE_FIELDS) {
    attributes[field.key] = normalizeNumber(
      attributesSource[field.key],
      field.min,
      field.max,
    );
  }

  const departments = { ...EMPTY_CHARACTER_STATS.departments };
  for (const field of DEPARTMENT_FIELDS) {
    departments[field.key] = normalizeNumber(
      departmentsSource[field.key],
      field.min,
      field.max,
    );
  }

  const stats: CharacterStats = {
    ...EMPTY_CHARACTER_STATS,
    attributes,
    departments,
    experience:
      typeof source.experience === "string" &&
      isCharacterExperience(source.experience)
        ? source.experience
        : null,
  };

  for (const field of TEXT_FIELDS) {
    stats[field.key] = normalizeText(source[field.key]);
  }
  for (const field of SCALAR_NUMBER_FIELDS) {
    stats[field.key] = normalizeNumber(source[field.key], field.min, field.max);
  }
  for (const field of LIST_FIELDS) {
    stats[field.key] = normalizeList(source[field.key]);
  }

  return stats;
}

// Für die Übersicht: unterscheidet „noch gar keine Werte hinterlegt" von
// „Werte vorhanden", ohne dass die Aufrufer jedes Feld einzeln prüfen.
export function isCharacterStatsEmpty(stats: CharacterStats): boolean {
  const hasNumber = [
    ...ATTRIBUTE_FIELDS.map((f) => stats.attributes[f.key]),
    ...DEPARTMENT_FIELDS.map((f) => stats.departments[f.key]),
    ...SCALAR_NUMBER_FIELDS.map((f) => stats[f.key]),
  ].some((value) => value !== null);
  if (hasNumber) return false;

  if (stats.experience !== null) return false;
  if (TEXT_FIELDS.some((f) => stats[f.key] !== null)) return false;
  if (LIST_FIELDS.some((f) => stats[f.key].length > 0)) return false;
  return true;
}
