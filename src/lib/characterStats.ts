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

// Labels: deutsches Label plus der englische Begriff des offiziellen Bogens —
// die Spielrunde nutzt beides gemischt (siehe Beispielbogen). Das Formular
// zeigt beide untereinander, wie die zweisprachige Beschriftung auf dem Bogen.
export interface StatFieldSpec<K> {
  key: K;
  label: string;
  // Begriff auf dem englischen Originalbogen (fehlt, wo er identisch ist).
  original?: string;
}

export interface NumberFieldSpec<K> extends StatFieldSpec<K> {
  min: number;
  max: number;
}

// Wertebereiche + Verteilungsregeln der Runde: Attribute liegen zwischen 7 und
// 12, dabei darf höchstens EIN Attribut auf 12 und höchstens ZWEI dürfen auf 11
// stehen. Für Disziplinen gilt dasselbe Muster mit 1–5, einer auf 5 und
// höchstens zwei auf 4. Zentral hier definiert, damit Formular (Eingabe-
// Grenzen + Hinweis), Server-Action (verbindliche Prüfung) und Tests dieselbe
// Quelle nutzen.
export interface DistributionRule {
  min: number;
  max: number;
  // Höchstens so viele Werte dürfen auf dem Maximum stehen.
  maxAtMax: number;
  // … und höchstens so viele auf dem Wert direkt darunter.
  maxAtSecond: number;
}

export const ATTRIBUTE_RULE: DistributionRule = {
  min: 7,
  max: 12,
  maxAtMax: 1,
  maxAtSecond: 2,
};

export const DEPARTMENT_RULE: DistributionRule = {
  min: 1,
  max: 5,
  maxAtMax: 1,
  maxAtSecond: 2,
};

export const ATTRIBUTE_FIELDS: NumberFieldSpec<keyof CharacterAttributes>[] = [
  { key: "control", label: "Kontrolle", original: "Control", ...ATTRIBUTE_RULE },
  { key: "daring", label: "Wagemut", original: "Daring", ...ATTRIBUTE_RULE },
  // Englisch und Deutsch identisch — trotzdem beide gesetzt, damit jeder
  // Wertekasten zweizeilig beschriftet ist und die Reihe gleichmäßig bleibt.
  { key: "fitness", label: "Fitness", original: "Fitness", ...ATTRIBUTE_RULE },
  { key: "insight", label: "Einsicht", original: "Insight", ...ATTRIBUTE_RULE },
  { key: "presence", label: "Präsenz", original: "Presence", ...ATTRIBUTE_RULE },
  { key: "reason", label: "Verstand", original: "Reason", ...ATTRIBUTE_RULE },
];

export const DEPARTMENT_FIELDS: NumberFieldSpec<keyof CharacterDepartments>[] = [
  { key: "command", label: "Kommando", original: "Command", ...DEPARTMENT_RULE },
  { key: "conn", label: "Steuerung", original: "Conn", ...DEPARTMENT_RULE },
  { key: "engineering", label: "Technik", original: "Engineering", ...DEPARTMENT_RULE },
  { key: "security", label: "Sicherheit", original: "Security", ...DEPARTMENT_RULE },
  { key: "medicine", label: "Medizin", original: "Medicine", ...DEPARTMENT_RULE },
  { key: "science", label: "Wissenschaft", original: "Science", ...DEPARTMENT_RULE },
];

// Einzelne Zahlenwerte außerhalb von Attributen/Disziplinen. „stress" fehlt
// hier bewusst: der Wert wird aus Fitness + Talent-Bonus berechnet (siehe
// computeStress) und ist deshalb kein Eingabefeld.
type ScalarNumberKey =
  | "reputation"
  | "stressBonus"
  | "resistance"
  | "determination";

export const SCALAR_NUMBER_FIELDS: NumberFieldSpec<ScalarNumberKey>[] = [
  { key: "stressBonus", label: "Stress-Bonus aus Talenten", original: "Talent bonus", min: 0, max: 20 },
  // Der Bogen nennt den Wert „Protection"; der Speicher-Schlüssel bleibt
  // bewusst „resistance", damit bereits gepflegte Werte erhalten bleiben.
  { key: "resistance", label: "Schutz", original: "Protection", min: 0, max: 20 },
  // Der Bogen hat genau drei Determinationskästchen.
  { key: "determination", label: "Entschlossenheit", original: "Determination", min: 0, max: 3 },
  { key: "reputation", label: "Ansehen", original: "Reputation", min: 0, max: 50 },
];

// Maximaler Stress = Fitness + Bonus aus Talenten (z.B. „Resolut: +3 max.
// Stress"). Ohne gepflegte Fitness gibt es keinen sinnvollen Wert — dann null.
export function computeStress(stats: CharacterStats): number | null {
  const fitness = stats.attributes.fitness;
  if (fitness === null) return null;
  return fitness + (stats.stressBonus ?? 0);
}

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
  { key: "pronouns", label: "Pronomen", original: "Pronouns" },
  { key: "characterRole", label: "Rolle", original: "Character Role" },
  { key: "assignment", label: "Zuweisung", original: "Assignment" },
  { key: "environment", label: "Herkunft", original: "Environment" },
  { key: "upbringing", label: "Erziehung", original: "Upbringing" },
  { key: "careerPath", label: "Laufbahn", original: "Career Path" },
  { key: "traits", label: "Merkmale", original: "Species & Traits" },
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
  { key: "values", label: "Werte", original: "Values" },
  { key: "focuses", label: "Schwerpunkte", original: "Focuses" },
  { key: "talents", label: "Talente", original: "Talents" },
  { key: "speciesAbilities", label: "Spezies-Fähigkeiten", original: "Species Ability" },
  { key: "specialRules", label: "Sonderregeln", original: "Special Rules" },
  { key: "attacks", label: "Angriffe", original: "Attacks" },
  { key: "equipment", label: "Ausrüstung", original: "Other Equipment" },
  { key: "careerEvents", label: "Karriere-Ereignisse", original: "Career Events" },
  { key: "pastimes", label: "Hobbys", original: "Pastimes" },
];

export const EMPTY_CHARACTER_STATS: CharacterStats = {
  creationLocked: false,
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
  stressBonus: null,
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
    creationLocked: source.creationLocked === true,
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

// Prüft die Verteilungsregeln einer Wertegruppe (siehe DistributionRule) und
// liefert deutsche Fehlermeldungen. Nur GEPFLEGTE Werte zählen — ein halb
// ausgefüllter Bogen soll sich speichern lassen, ohne dass fehlende Felder als
// Regelverstoß gelten. Wird vom Formular (Live-Hinweis) und von der
// Server-Action (verbindlich) genutzt.
export function validateDistribution(
  values: (number | null)[],
  rule: DistributionRule,
  groupLabel: string,
): string[] {
  const filled = values.filter((value): value is number => value !== null);
  const errors: string[] = [];

  if (filled.some((value) => value < rule.min || value > rule.max)) {
    errors.push(
      `${groupLabel}: Werte müssen zwischen ${rule.min} und ${rule.max} liegen.`,
    );
  }

  const atMax = filled.filter((value) => value === rule.max).length;
  if (atMax > rule.maxAtMax) {
    errors.push(
      `${groupLabel}: höchstens ${rule.maxAtMax} Wert${rule.maxAtMax === 1 ? "" : "e"} auf ${rule.max} (aktuell ${atMax}).`,
    );
  }

  const atSecond = filled.filter((value) => value === rule.max - 1).length;
  if (atSecond > rule.maxAtSecond) {
    errors.push(
      `${groupLabel}: höchstens ${rule.maxAtSecond} Werte auf ${rule.max - 1} (aktuell ${atSecond}).`,
    );
  }

  return errors;
}

// Alle Regelverstöße eines Bogens auf einmal — Attribute und Disziplinen.
export function validateCharacterStats(stats: CharacterStats): string[] {
  return [
    ...validateDistribution(
      ATTRIBUTE_FIELDS.map((field) => stats.attributes[field.key]),
      ATTRIBUTE_RULE,
      "Attribute",
    ),
    ...validateDistribution(
      DEPARTMENT_FIELDS.map((field) => stats.departments[field.key]),
      DEPARTMENT_RULE,
      "Disziplinen",
    ),
  ];
}

// Sind alle sechs Attribute UND alle sechs Disziplinen gesetzt? Das ist die
// Voraussetzung fürs Festschreiben der Ersterschaffung: danach sind beide
// Blöcke schreibgeschützt und nur noch über AP steigerbar — checkAdvancement
// weigert sich aber, einen leeren (null) Wert zu steigern. Ein festgeschriebener
// Bogen mit Lücken wäre also nicht mehr zu füllen.
export function hasCompleteCreationValues(stats: CharacterStats): boolean {
  return [
    ...ATTRIBUTE_FIELDS.map((f) => stats.attributes[f.key]),
    ...DEPARTMENT_FIELDS.map((f) => stats.departments[f.key]),
  ].every((value) => value !== null);
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
