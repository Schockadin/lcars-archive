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
  LifepathCareerEvent,
  LifepathCorrection,
  PendingAdvancement,
  RuleModuleCharacterData,
  Sta2eLifepath,
  TechnomageCharacterData,
  TechnomageSchool,
} from "@/types/characterStats";
import { TECHNOMAGE_SCHOOL_IDS } from "@/types/characterStats";
import { normalizeCareerEventEntry } from "@/lib/sta2eCareerEvents";

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
  { key: "specialRules", label: "Rollenbonus", original: "Role Bonus" },
  { key: "attacks", label: "Angriffe", original: "Attacks" },
  { key: "equipment", label: "Ausrüstung", original: "Other Equipment" },
  { key: "careerEvents", label: "Karriere-Ereignisse", original: "Career Events" },
  { key: "pastimes", label: "Hobbys", original: "Pastimes" },
];

export const EMPTY_CHARACTER_STATS: CharacterStats = {
  creationLocked: false,
  creationMethod: "ap",
  lifepath: null,
  pendingAdvancements: [],
  pronouns: null,
  characterRole: null,
  technomage: {
    primarySchool: null,
    weakSchools: [],
    spells: [],
    powerPointsCurrent: null,
    powerPointsMaximumAtLastUpdate: null,
    powerPointsRecoveryProgress: null,
  },
  ruleModules: {},
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

function normalizeProgress(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value.trim()) : value;
  return typeof num === "number" && Number.isFinite(num) && num >= 0 && num < 1
    ? num
    : null;
}

// Zurückgenommene Steigerungen (siehe PendingAdvancement). Wie überall hier
// tolerant: was nicht die erwartete Form hat, fliegt raus statt kaputt
// weitergereicht zu werden — die Liste steuert später echte Buchungen.
function normalizePendingAdvancements(value: unknown): PendingAdvancement[] {
  if (!Array.isArray(value)) return [];
  const kinds = ["attribute", "department", "talent", "focus"] as const;
  return value.flatMap((raw): PendingAdvancement[] => {
    const source = asRecord(raw);
    const kind = kinds.find((k) => k === source.kind);
    const label = normalizeText(source.label);
    const cost = typeof source.cost === "number" ? source.cost : NaN;
    if (!kind || !label || !Number.isInteger(cost) || cost < 0) return [];
    const key = normalizeText(source.key);
    const entry = normalizeText(source.entry);
    // Ohne Ziel lässt sich nichts wieder anwenden: Werte brauchen den
    // Schlüssel, Talente/Schwerpunkte den Eintrag.
    if (kind === "attribute" || kind === "department") {
      if (!key) return [];
    } else if (!entry) {
      return [];
    }
    return [
      {
        kind,
        key,
        entry,
        label,
        cost,
        recordedAt: normalizeText(source.recordedAt) ?? "",
      },
    ];
  });
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeCareerEvents(value: unknown): string[] {
  return normalizeList(value).map(normalizeCareerEventEntry);
}

function normalizeTechnomage(value: unknown): TechnomageCharacterData {
  const source = asRecord(value);
  const primarySchool =
    typeof source.primarySchool === "string" &&
    (TECHNOMAGE_SCHOOL_IDS as readonly string[]).includes(source.primarySchool)
      ? (source.primarySchool as TechnomageSchool)
      : null;
  const weakSchools = [
    ...new Set(
      normalizeList(source.weakSchools).filter(
        (school): school is TechnomageSchool =>
          (TECHNOMAGE_SCHOOL_IDS as readonly string[]).includes(school) &&
          school !== primarySchool,
      ),
    ),
  ].slice(0, 3);

  return {
    primarySchool,
    weakSchools,
    spells: [...new Set(normalizeList(source.spells))],
    powerPointsCurrent: normalizeNumber(source.powerPointsCurrent, 0, 9999),
    powerPointsMaximumAtLastUpdate: normalizeNumber(
      source.powerPointsMaximumAtLastUpdate,
      0,
      9999,
    ),
    powerPointsRecoveryProgress: normalizeProgress(
      source.powerPointsRecoveryProgress,
    ),
  };
}

function normalizeRuleModuleData(value: unknown): RuleModuleCharacterData {
  const source = asRecord(value);
  const rawResources = asRecord(source.resources);
  const resources: Record<string, number> = {};
  for (const [id, raw] of Object.entries(rawResources)) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(id)) continue;
    const number = typeof raw === "string" ? Number(raw.trim()) : raw;
    if (typeof number === "number" && Number.isInteger(number) && number >= 0 && number <= 999_999) {
      resources[id] = number;
    }
  }
  const prestigeClass = normalizeText(source.prestigeClass);
  const rawCollections = asRecord(source.selectedCollectionEntries);
  const selectedCollectionEntries: Record<string, string[]> = {};
  for (const [collectionId, rawEntries] of Object.entries(rawCollections)) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(collectionId)) continue;
    selectedCollectionEntries[collectionId] = [...new Set(normalizeList(rawEntries))].slice(0, 500);
  }
  return {
    resources,
    selectedTalents: normalizeList(source.selectedTalents).slice(0, 500),
    selectedStatuses: [...new Set(normalizeList(source.selectedStatuses))].slice(0, 100),
    selectedCollectionEntries,
    prestigeClass,
    prestigeAbilities: [...new Set(normalizeList(source.prestigeAbilities))].slice(0, 200),
  };
}

function normalizeRuleModules(value: unknown): Record<string, RuleModuleCharacterData> {
  const source = asRecord(value);
  const result: Record<string, RuleModuleCharacterData> = {};
  for (const [id, moduleData] of Object.entries(source)) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(id)) continue;
    result[id] = normalizeRuleModuleData(moduleData);
  }
  return result;
}

function normalizeLifepath(value: unknown): Sta2eLifepath | null {
  if (value === null || value === undefined) return null;
  const source = asRecord(value);
  const environment = asRecord(source.environment);
  const upbringing = asRecord(source.upbringing);
  const career = asRecord(source.career);
  const experience = asRecord(source.experience);
  const finishing = asRecord(source.finishing);
  const roleBonus = asRecord(source.roleBonus);
  const reallocation = asRecord(career.reallocation);
  const careerEvents: LifepathCareerEvent[] = Array.isArray(source.careerEvents)
    ? source.careerEvents.slice(0, 8).flatMap((raw): LifepathCareerEvent[] => {
        const event = asRecord(raw);
        const id = normalizeText(event.id);
        if (!id) return [];
        return [{
          id,
          attribute: normalizeText(event.attribute) as LifepathCareerEvent["attribute"],
          department: normalizeText(event.department) as LifepathCareerEvent["department"],
          focus: normalizeText(event.focus) ?? "",
          trait: normalizeText(event.trait),
          attributeBonus: event.attributeBonus !== false,
          departmentBonus: event.departmentBonus !== false,
          focusBonus: event.focusBonus !== false,
        }];
      })
    : [];
  const corrections: LifepathCorrection[] = Array.isArray(source.corrections)
    ? source.corrections.slice(0, 24).flatMap((raw): LifepathCorrection[] => {
        const correction = asRecord(raw);
        const kind = correction.kind === "attribute" || correction.kind === "department"
          ? correction.kind
          : null;
        const from = normalizeText(correction.from);
        const to = normalizeText(correction.to);
        return kind && from && to ? [{ kind, from, to }] : [];
      })
    : [];
  const experienceValue = normalizeText(experience.value);

  return {
    speciesAttributes: normalizeList(source.speciesAttributes).slice(0, 6) as Sta2eLifepath["speciesAttributes"],
    environment: {
      choice: normalizeText(environment.choice),
      attribute: normalizeText(environment.attribute) as Sta2eLifepath["environment"]["attribute"],
      department: normalizeText(environment.department) as Sta2eLifepath["environment"]["department"],
      value: normalizeText(environment.value) ?? "",
      otherSpecies: normalizeText(environment.otherSpecies) ?? "",
      otherSpeciesAttributes: normalizeList(environment.otherSpeciesAttributes).slice(0, 6) as Sta2eLifepath["environment"]["otherSpeciesAttributes"],
    },
    upbringing: {
      choice: normalizeText(upbringing.choice),
      accepted: typeof upbringing.accepted === "boolean" ? upbringing.accepted : null,
      department: normalizeText(upbringing.department) as Sta2eLifepath["upbringing"]["department"],
      focus: normalizeText(upbringing.focus) ?? "",
      talent: normalizeText(upbringing.talent) ?? "",
    },
    career: {
      path: normalizeText(career.path),
      track: normalizeText(career.track),
      attributes: normalizeList(career.attributes).slice(0, 6) as Sta2eLifepath["career"]["attributes"],
      majorDepartment: normalizeText(career.majorDepartment) as Sta2eLifepath["career"]["majorDepartment"],
      minorDepartments: normalizeList(career.minorDepartments).slice(0, 6) as Sta2eLifepath["career"]["minorDepartments"],
      reallocation: normalizeText(reallocation.from) && normalizeText(reallocation.to)
        ? {
            from: normalizeText(reallocation.from) as keyof CharacterDepartments,
            to: normalizeText(reallocation.to) as keyof CharacterDepartments,
          }
        : null,
      trait: normalizeText(career.trait) ?? "",
      value: normalizeText(career.value) ?? "",
      focuses: normalizeList(career.focuses).slice(0, 6),
      talent: normalizeText(career.talent) ?? "",
    },
    experience: {
      value: experienceValue === "novice" || experienceValue === "experienced" || experienceValue === "veteran"
        ? experienceValue
        : null,
      statement: normalizeText(experience.statement) ?? "",
      talent: normalizeText(experience.talent) ?? "",
      noviceAttribute: normalizeText(experience.noviceAttribute) as Sta2eLifepath["experience"]["noviceAttribute"],
    },
    careerEvents,
    finishing: {
      value: normalizeText(finishing.value) ?? "",
      talent: normalizeText(finishing.talent) ?? "",
      attributes: normalizeList(finishing.attributes).slice(0, 6) as Sta2eLifepath["finishing"]["attributes"],
      departments: normalizeList(finishing.departments).slice(0, 6) as Sta2eLifepath["finishing"]["departments"],
      pastimes: normalizeList(finishing.pastimes).slice(0, 20),
    },
    corrections,
    roleBonus: {
      values: normalizeList(roleBonus.values).slice(0, 8),
      focuses: normalizeList(roleBonus.focuses).slice(0, 12),
    },
  };
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
    creationMethod:
      source.creationMethod === "sta2e-lifepath" || source.creationMethod === "sta2e-point-buy"
        ? source.creationMethod
        : "ap",
    lifepath: normalizeLifepath(source.lifepath),
    pendingAdvancements: normalizePendingAdvancements(source.pendingAdvancements),
    experience:
      typeof source.experience === "string" &&
      isCharacterExperience(source.experience)
        ? source.experience
        : null,
  };

  stats.technomage = normalizeTechnomage(source.technomage);
  stats.ruleModules = normalizeRuleModules(source.ruleModules);

  for (const field of TEXT_FIELDS) {
    stats[field.key] = normalizeText(source[field.key]);
  }
  for (const field of SCALAR_NUMBER_FIELDS) {
    stats[field.key] = normalizeNumber(source[field.key], field.min, field.max);
  }
  for (const field of LIST_FIELDS) {
    stats[field.key] =
      field.key === "careerEvents"
        ? normalizeCareerEvents(source[field.key])
        : normalizeList(source[field.key]);
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
  if (
    stats.technomage.primarySchool !== null ||
    stats.technomage.weakSchools.length > 0 ||
    stats.technomage.spells.length > 0 ||
    stats.technomage.powerPointsCurrent !== null ||
    stats.technomage.powerPointsMaximumAtLastUpdate !== null ||
    stats.technomage.powerPointsRecoveryProgress !== null
  ) return false;
  if (Object.values(stats.ruleModules).some((module) =>
    Object.values(module.resources).some((value) => value !== 0) ||
    module.selectedTalents.length > 0 || module.selectedStatuses.length > 0 ||
    module.prestigeClass !== null || module.prestigeAbilities.length > 0,
  )) return false;
  return true;
}
