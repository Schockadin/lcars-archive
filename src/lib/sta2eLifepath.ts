import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  validateCharacterStats,
} from "@/lib/characterStats";
import { careerEventByIdOrTitle } from "@/lib/sta2eCareerEvents";
import { findRoleOption, getSpeciesAbilityChoices } from "@/lib/sta2eCharacterOptions";
import { formatTalentSelection } from "@/lib/talentCatalog";
import type {
  CharacterAttributes,
  CharacterDepartments,
  CharacterExperience,
  CharacterStats,
  LifepathCareerEvent,
  Sta2eLifepath,
} from "@/types/characterStats";

export type AttributeKey = keyof CharacterAttributes;
export type DepartmentKey = keyof CharacterDepartments;

export const ATTRIBUTE_KEYS: AttributeKey[] = ATTRIBUTE_FIELDS.map((field) => field.key);
export const DEPARTMENT_KEYS: DepartmentKey[] = DEPARTMENT_FIELDS.map((field) => field.key);

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = Object.fromEntries(
  ATTRIBUTE_FIELDS.map((field) => [field.key, field.original ?? field.label]),
) as Record<AttributeKey, string>;
export const DEPARTMENT_LABELS: Record<DepartmentKey, string> = Object.fromEntries(
  DEPARTMENT_FIELDS.map((field) => [field.key, field.original ?? field.label]),
) as Record<DepartmentKey, string>;

export const EMPTY_STA2E_LIFEPATH: Sta2eLifepath = {
  speciesAttributes: [],
  environment: {
    choice: null,
    attribute: null,
    department: null,
    value: "",
    otherSpecies: "",
    otherSpeciesAttributes: [],
  },
  upbringing: { choice: null, accepted: null, department: null, focus: "", talent: "" },
  career: {
    path: null,
    track: null,
    attributes: [],
    majorDepartment: null,
    minorDepartments: [],
    reallocation: null,
    trait: "",
    value: "",
    focuses: [],
    talent: "",
  },
  experience: { value: null, statement: "", talent: "", noviceAttribute: null },
  careerEvents: [],
  finishing: { value: "", talent: "", attributes: [], departments: [], pastimes: [] },
  corrections: [],
  roleBonus: { values: [], focuses: [] },
};

export const ENVIRONMENT_OPTIONS = [
  { id: "another-species-world", name: "Another Species’ World", label: "Welt einer anderen Spezies", attributes: ["daring", "presence"] as AttributeKey[], departments: ["command", "security", "science"] as DepartmentKey[] },
  { id: "busy-colony", name: "Busy Colony", label: "Belebte Kolonie", attributes: ["control", "fitness"] as AttributeKey[], departments: ["conn", "security", "medicine"] as DepartmentKey[] },
  { id: "frontier-colony", name: "Frontier Colony", label: "Grenzkolonie", attributes: ATTRIBUTE_KEYS, departments: DEPARTMENT_KEYS, otherSpeciesRequired: true },
  { id: "homeworld", name: "Homeworld", label: "Heimatwelt", attributes: ATTRIBUTE_KEYS, departments: ["command", "security", "science"] as DepartmentKey[], speciesAttributeRequired: true },
  { id: "isolated-colony", name: "Isolated Colony", label: "Abgelegene Kolonie", attributes: ["reason", "insight"] as AttributeKey[], departments: ["engineering", "science", "medicine"] as DepartmentKey[] },
  { id: "starship-or-starbase", name: "Starship or Starbase", label: "Raumschiff oder Sternenbasis", attributes: ["control", "insight"] as AttributeKey[], departments: ["command", "conn", "engineering"] as DepartmentKey[] },
] as const;

interface UpbringingOption {
  id: string;
  name: string;
  accepted: [AttributeKey, AttributeKey, AttributeKey];
  rebelled: [AttributeKey, AttributeKey, AttributeKey];
  departments: DepartmentKey[];
}

export const UPBRINGING_OPTIONS: readonly UpbringingOption[] = [
  { id: "agriculture-rural", name: "Agriculture or Rural", accepted: ["control", "fitness", "fitness"], rebelled: ["presence", "reason", "reason"], departments: ["conn", "security", "medicine"] },
  { id: "artistic-creative", name: "Artistic and Creative", accepted: ["insight", "presence", "presence"], rebelled: ["daring", "fitness", "fitness"], departments: ["command", "engineering", "science"] },
  { id: "business-trade", name: "Business or Trade", accepted: ["daring", "presence", "presence"], rebelled: ["insight", "insight", "reason"], departments: ["command", "engineering", "science"] },
  { id: "diplomacy-politics", name: "Diplomacy and Politics", accepted: ["control", "presence", "presence"], rebelled: ["fitness", "reason", "reason"], departments: ["command", "conn", "security"] },
  { id: "science-technology", name: "Science and Technology", accepted: ["control", "control", "reason"], rebelled: ["daring", "insight", "insight"], departments: ["conn", "engineering", "science", "medicine"] },
  { id: "starfleet-military", name: "Starfleet or Military", accepted: ["control", "control", "fitness"], rebelled: ["daring", "daring", "insight"], departments: DEPARTMENT_KEYS },
];

export interface CareerPathOption {
  id: string;
  name: string;
  trait: string;
  military: boolean;
  tracks?: { id: string; name: string; majors: DepartmentKey[] }[];
  majors: DepartmentKey[];
  minors: DepartmentKey[];
  attributeRequirement?: AttributeKey;
  attributeRequirementAny?: AttributeKey[];
  reallocation?: boolean;
}

export const CAREER_PATH_OPTIONS: readonly CareerPathOption[] = [
  { id: "starfleet-officer", name: "Starfleet (Officer)", trait: "Starfleet Officer", military: true, tracks: [
    { id: "command", name: "Command", majors: ["command", "conn"] },
    { id: "operations", name: "Operations", majors: ["engineering", "security"] },
    { id: "sciences", name: "Sciences", majors: ["science", "medicine"] },
  ], majors: DEPARTMENT_KEYS, minors: DEPARTMENT_KEYS },
  { id: "starfleet-enlisted", name: "Starfleet (Enlisted)", trait: "Starfleet Crew", military: true, majors: ["security"], minors: ["command", "conn", "engineering", "medicine", "science"] },
  { id: "starfleet-intelligence", name: "Starfleet (Intelligence)", trait: "Intelligence Operative", military: true, majors: ["conn", "security", "engineering", "science"], minors: DEPARTMENT_KEYS },
  { id: "diplomatic-corps", name: "Diplomatic Corps", trait: "Diplomat", military: false, majors: ["command", "security"], minors: DEPARTMENT_KEYS },
  { id: "civilian-physician", name: "Civilian (Physician)", trait: "Physician", military: false, majors: ["medicine"], minors: DEPARTMENT_KEYS, reallocation: true },
  { id: "civilian-scientist", name: "Civilian (Scientist)", trait: "Scientist", military: false, majors: ["science", "engineering"], minors: DEPARTMENT_KEYS, attributeRequirement: "reason", reallocation: true },
  { id: "civilian-official", name: "Civilian (Official)", trait: "Administrator", military: false, majors: ["command"], minors: DEPARTMENT_KEYS, attributeRequirementAny: ["insight", "presence"], reallocation: true },
  { id: "civilian-trader", name: "Civilian (Trader)", trait: "Merchant", military: false, majors: ["command"], minors: DEPARTMENT_KEYS, attributeRequirementAny: ["insight", "presence"], reallocation: true },
];

export function checkSta2eProfileChoices(
  stats: CharacterStats,
  alreadyStored?: CharacterStats,
): string | null {
  if (stats.creationMethod === "sta2e-lifepath") return null;
  const choices = [
    { key: "environment", label: "Environment", values: ENVIRONMENT_OPTIONS.map((option) => option.name) },
    { key: "upbringing", label: "Upbringing", values: UPBRINGING_OPTIONS.map((option) => option.name) },
    { key: "careerPath", label: "Career Path", values: CAREER_PATH_OPTIONS.map((option) => option.name) },
  ] as const;
  for (const choice of choices) {
    const value = stats[choice.key];
    const validValues: readonly string[] = choice.values;
    if (
      value &&
      !validValues.includes(value) &&
      value !== alreadyStored?.[choice.key]
    ) {
      return `Ungültige ${choice.label}-Auswahl.`;
    }
  }
  return null;
}

export function newLifepathEvent(): LifepathCareerEvent {
  return { id: "", attribute: null, department: null, focus: "", trait: null, attributeBonus: true, departmentBonus: true, focusBonus: true };
}

function add<K extends string>(target: Record<K, number>, key: K, amount = 1) {
  target[key] += amount;
}

function blankAttributes(): Record<AttributeKey, number> {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 7])) as Record<AttributeKey, number>;
}

function blankDepartments(): Record<DepartmentKey, number> {
  return Object.fromEntries(DEPARTMENT_KEYS.map((key) => [key, 1])) as Record<DepartmentKey, number>;
}

function validKey<K extends string>(value: unknown, keys: K[]): value is K {
  return typeof value === "string" && keys.includes(value as K);
}

function distinct<T>(values: T[]): boolean {
  return new Set(values).size === values.length;
}

/** Rebuild sheet values from the recorded choices so the sheet and preview stay in sync. */
export function applySta2eLifepath(stats: CharacterStats, speciesNames: string[] = []): CharacterStats {
  const lp = stats.lifepath;
  if (!lp || stats.creationMethod !== "sta2e-lifepath") return stats;
  const attributes = blankAttributes();
  const departments = blankDepartments();
  const values: string[] = [];
  const focuses: string[] = [];
  const talents: string[] = [];
  const addAttribute = (key: unknown, amount = 1) => {
    if (validKey(key, ATTRIBUTE_KEYS)) add(attributes, key, amount);
  };
  const addDepartment = (key: unknown, amount = 1) => {
    if (validKey(key, DEPARTMENT_KEYS)) add(departments, key, amount);
  };

  lp.speciesAttributes.forEach((key) => addAttribute(key));
  const environment = ENVIRONMENT_OPTIONS.find((option) => option.id === lp.environment.choice);
  if (environment) {
    addAttribute(lp.environment.attribute);
    addDepartment(lp.environment.department);
    if (lp.environment.value.trim()) values.push(lp.environment.value.trim());
  }
  const upbringing = UPBRINGING_OPTIONS.find((option) => option.id === lp.upbringing.choice);
  if (upbringing && lp.upbringing.accepted !== null) {
    (lp.upbringing.accepted ? upbringing.accepted : upbringing.rebelled).forEach((key) => addAttribute(key));
    addDepartment(lp.upbringing.department);
    if (lp.upbringing.focus.trim()) focuses.push(lp.upbringing.focus.trim());
    if (lp.upbringing.talent.trim()) talents.push(lp.upbringing.talent.trim());
  }

  const career = CAREER_PATH_OPTIONS.find((option) => option.id === lp.career.path);
  if (career) {
    lp.career.attributes.forEach((key) => addAttribute(key));
    if (career.id === "starfleet-enlisted") {
      addDepartment("conn");
      addDepartment("security", 2);
      addDepartment("engineering");
    } else {
      const major = lp.career.majorDepartment;
      addDepartment(major, 2);
      lp.career.minorDepartments.forEach((key) => addDepartment(key));
      if (career.reallocation && lp.career.reallocation) {
        addDepartment(lp.career.reallocation.from, -1);
        addDepartment(lp.career.reallocation.to);
      }
    }
    if (lp.career.value.trim()) values.push(lp.career.value.trim());
    lp.career.focuses.map((focus) => focus.trim()).filter(Boolean).forEach((focus) => focuses.push(focus));
    if (lp.career.talent.trim()) talents.push(lp.career.talent.trim());
  }

  const experienceValue = lp.experience.value;
  if (lp.experience.statement.trim()) values.push(lp.experience.statement.trim());
  if (experienceValue === "novice" && validKey(lp.experience.noviceAttribute, ATTRIBUTE_KEYS)) {
    talents.push(formatTalentSelection("Untapped Potential", ATTRIBUTE_LABELS[lp.experience.noviceAttribute]));
  } else if (experienceValue === "veteran") {
    talents.push("Veteran");
  } else if (experienceValue === "experienced" && lp.experience.talent.trim()) {
    talents.push(lp.experience.talent.trim());
  }

  const selectedEventTitles: string[] = [];
  for (const selection of lp.careerEvents) {
    if (!selection?.id) continue;
    const event = careerEventByIdOrTitle(selection.id);
    if (!event) continue;
    selectedEventTitles.push(event.id);
    if (selection.attributeBonus) addAttribute(event.attribute === "any" ? selection.attribute : event.attribute);
    if (selection.departmentBonus) addDepartment(event.department === "any" ? selection.department : event.department);
    if (selection.focusBonus && selection.focus.trim()) focuses.push(selection.focus.trim());
  }

  lp.finishing.attributes.forEach((key) => addAttribute(key));
  lp.finishing.departments.forEach((key) => addDepartment(key));
  if (lp.finishing.value.trim()) values.push(lp.finishing.value.trim());
  if (lp.finishing.talent.trim()) talents.push(lp.finishing.talent.trim());

  const role = findRoleOption(stats.characterRole);
  const roleId = role?.id;
  const isDenobulanAbility = stats.speciesAbilities.some((entry) =>
    /denobulan.*breadth of study/i.test(entry),
  );
  const wantedRoleFocuses = roleId === "expert" ? 1 : roleId === "ships-doctor" ? 2 : 0;
  const wantedSpeciesFocuses = isDenobulanAbility ? 2 : 0;
  for (let i = 0; i < wantedRoleFocuses; i++) {
    const focus = lp.roleBonus.focuses[i]?.trim();
    if (focus) focuses.push(focus);
  }
  if (roleId === "expert" && lp.roleBonus.values[0]?.trim()) values.push(lp.roleBonus.values[0].trim());
  for (let i = 0; i < wantedSpeciesFocuses; i++) {
    const focus = lp.roleBonus.focuses[wantedRoleFocuses + i]?.trim();
    if (focus) focuses.push(focus);
  }
  for (const correction of lp.corrections) {
    if (correction.kind === "attribute" && validKey(correction.from, ATTRIBUTE_KEYS) && validKey(correction.to, ATTRIBUTE_KEYS)) {
      addAttribute(correction.from, -1);
      addAttribute(correction.to);
    } else if (correction.kind === "department" && validKey(correction.from, DEPARTMENT_KEYS) && validKey(correction.to, DEPARTMENT_KEYS)) {
      addDepartment(correction.from, -1);
      addDepartment(correction.to);
    }
  }

  const finalAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, attributes[key] >= 7 && attributes[key] <= 12 ? attributes[key] : null])) as unknown as CharacterAttributes;
  const finalDepartments = Object.fromEntries(DEPARTMENT_KEYS.map((key) => [key, departments[key] >= 1 && departments[key] <= 5 ? departments[key] : null])) as unknown as CharacterDepartments;
  // Species live on the character head rather than in CharacterStats.
  const generatedTraits = [lp.career.trait, ...lp.careerEvents.map((selection) => selection.trait)].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  const speciesTraits = speciesNames.map((value) => value.trim()).filter(Boolean);

  return {
    ...stats,
    environment: environment?.name ?? null,
    upbringing: upbringing?.name ?? null,
    careerPath: career?.name ?? null,
    experience: experienceValue,
    traits: [...speciesTraits, ...generatedTraits].join(", ") || null,
    careerEvents: selectedEventTitles,
    attributes: finalAttributes,
    departments: finalDepartments,
    values: [...new Set(values)],
    focuses: [...new Set(focuses)],
    talents: [...new Set(talents)],
    pastimes: [...new Set(lp.finishing.pastimes.map((pastime) => pastime.trim()).filter(Boolean))],
  };
}

function rawRatings(stats: CharacterStats) {
  const lp = stats.lifepath;
  const attributes = blankAttributes();
  const departments = blankDepartments();
  if (!lp) return { attributes, departments };
  lp.speciesAttributes.forEach((key) => { if (validKey(key, ATTRIBUTE_KEYS)) add(attributes, key); });
  const environment = ENVIRONMENT_OPTIONS.find((item) => item.id === lp.environment.choice);
  if (environment) {
    if (validKey(lp.environment.attribute, ATTRIBUTE_KEYS)) add(attributes, lp.environment.attribute);
    if (validKey(lp.environment.department, DEPARTMENT_KEYS)) add(departments, lp.environment.department);
  }
  const upbringing = UPBRINGING_OPTIONS.find((item) => item.id === lp.upbringing.choice);
  if (upbringing && lp.upbringing.accepted !== null) {
    (lp.upbringing.accepted ? upbringing.accepted : upbringing.rebelled).forEach((key) => add(attributes, key));
    if (validKey(lp.upbringing.department, DEPARTMENT_KEYS)) add(departments, lp.upbringing.department);
  }
  const career = CAREER_PATH_OPTIONS.find((item) => item.id === lp.career.path);
  if (career) {
    lp.career.attributes.forEach((key) => { if (validKey(key, ATTRIBUTE_KEYS)) add(attributes, key); });
    if (career.id === "starfleet-enlisted") {
      add(departments, "conn"); add(departments, "security", 2); add(departments, "engineering");
    } else {
      if (validKey(lp.career.majorDepartment, DEPARTMENT_KEYS)) add(departments, lp.career.majorDepartment, 2);
      lp.career.minorDepartments.forEach((key) => { if (validKey(key, DEPARTMENT_KEYS)) add(departments, key); });
      if (career.reallocation && lp.career.reallocation) {
        if (validKey(lp.career.reallocation.from, DEPARTMENT_KEYS)) add(departments, lp.career.reallocation.from, -1);
        if (validKey(lp.career.reallocation.to, DEPARTMENT_KEYS)) add(departments, lp.career.reallocation.to);
      }
    }
  }
  for (const selection of lp.careerEvents) {
    const event = careerEventByIdOrTitle(selection.id);
    if (!event) continue;
    const attribute = event.attribute === "any" ? selection.attribute : event.attribute;
    const department = event.department === "any" ? selection.department : event.department;
    if (selection.attributeBonus && validKey(attribute, ATTRIBUTE_KEYS)) add(attributes, attribute);
    if (selection.departmentBonus && validKey(department, DEPARTMENT_KEYS)) add(departments, department);
  }
  lp.finishing.attributes.forEach((key) => { if (validKey(key, ATTRIBUTE_KEYS)) add(attributes, key); });
  lp.finishing.departments.forEach((key) => { if (validKey(key, DEPARTMENT_KEYS)) add(departments, key); });
  return { attributes, departments };
}

export function lifepathReallocationChoices(stats: CharacterStats, kind: "attribute" | "department") {
  const { attributes, departments } = rawRatings(stats);
  const minimum = kind === "attribute" ? 7 : 1;
  const fromCounts = new Map<string, number>();
  const toCounts = new Map<string, number>();
  for (const entry of stats.lifepath?.corrections ?? []) {
    if (entry.kind !== kind) continue;
    fromCounts.set(entry.from, (fromCounts.get(entry.from) ?? 0) + 1);
    toCounts.set(entry.to, (toCounts.get(entry.to) ?? 0) + 1);
  }
  const max = kind === "attribute" ? (stats.experience === "novice" ? 11 : 12) : (stats.experience === "novice" ? 4 : 5);
  if (kind === "attribute") {
    return {
      from: ATTRIBUTE_KEYS.filter((key) => attributes[key] - (fromCounts.get(key) ?? 0) > minimum),
      to: ATTRIBUTE_KEYS.filter((key) => attributes[key] + (toCounts.get(key) ?? 0) < max),
    };
  }
  return {
    from: DEPARTMENT_KEYS.filter((key) => departments[key] - (fromCounts.get(key) ?? 0) > minimum),
    to: DEPARTMENT_KEYS.filter((key) => departments[key] + (toCounts.get(key) ?? 0) < max),
  };
}

export function checkSta2eLifepath(
  stats: CharacterStats,
  species: string[],
  rank: string | null = null,
): string[] {
  if (stats.creationMethod !== "sta2e-lifepath") return [];
  const lp = stats.lifepath;
  if (!lp) return ["Der Lifepath ist nicht vollständig gespeichert."];
  const errors: string[] = [];
  const require = (condition: unknown, message: string) => { if (!condition) errors.push(message); };
  require(species.length > 0, "Schritt 1: Wähle mindestens eine Spezies.");
  require(lp.speciesAttributes.length === 3 && distinct(lp.speciesAttributes) && lp.speciesAttributes.every((key) => validKey(key, ATTRIBUTE_KEYS)), "Schritt 1: Wähle genau drei verschiedene Spezies-Attribute.");
  const environment = ENVIRONMENT_OPTIONS.find((item) => item.id === lp.environment.choice);
  require(environment, "Schritt 2: Wähle eine Herkunft.");
  if (environment) {
    require(Boolean(lp.environment.value.trim()), "Schritt 2: Trage einen Wert für die Herkunft ein.");
    const allowedEnvironmentAttributes = environment.id === "homeworld"
      ? lp.speciesAttributes
      : environment.id === "frontier-colony"
        ? lp.environment.otherSpeciesAttributes
        : environment.attributes;
    require(validKey(lp.environment.attribute, ATTRIBUTE_KEYS) && allowedEnvironmentAttributes.some((key) => key === lp.environment.attribute), "Schritt 2: Wähle ein zulässiges Attribut.");
    require(validKey(lp.environment.department, DEPARTMENT_KEYS) && environment.departments.includes(lp.environment.department), "Schritt 2: Wähle eine zulässige Disziplin.");
    if (environment.id === "homeworld") require(lp.speciesAttributes.includes(lp.environment.attribute!), "Bei Heimatwelt muss das Attribut eines der Spezies-Attribute sein.");
    if (environment.id === "frontier-colony") {
      require(lp.environment.otherSpecies.trim().length > 0, "Bei Grenzkolonie muss die andere Spezies angegeben werden.");
      require(lp.environment.otherSpeciesAttributes.length === 3 && distinct(lp.environment.otherSpeciesAttributes) && lp.environment.otherSpeciesAttributes.every((key) => validKey(key, ATTRIBUTE_KEYS)), "Bei Grenzkolonie müssen drei gültige Attribute der anderen Spezies festgelegt sein.");
      require(lp.environment.otherSpeciesAttributes.includes(lp.environment.attribute!), "Das Grenzkolonie-Attribut muss zu den drei Attributen der anderen Spezies gehören.");
    }
  }
  const upbringing = UPBRINGING_OPTIONS.find((item) => item.id === lp.upbringing.choice);
  require(upbringing && lp.upbringing.accepted !== null, "Schritt 3: Wähle eine Erziehung und ob der Charakter sie angenommen oder abgelehnt hat.");
  if (upbringing) {
    require(validKey(lp.upbringing.department, DEPARTMENT_KEYS) && upbringing.departments.includes(lp.upbringing.department), "Schritt 3: Wähle eine für diese Erziehung zulässige Disziplin.");
    require(Boolean(lp.upbringing.focus.trim()), "Schritt 3: Wähle einen Schwerpunkt.");
    require(Boolean(lp.upbringing.talent.trim()), "Schritt 3: Wähle ein Talent.");
  }
  const career = CAREER_PATH_OPTIONS.find((item) => item.id === lp.career.path);
  require(career, "Schritt 4: Wähle einen Karriereweg.");
  if (career) {
    require(lp.career.attributes.length === 3, "Schritt 4: Verteile genau drei Attributspunkte.");
    require(lp.career.attributes.every((key) => validKey(key, ATTRIBUTE_KEYS)), "Schritt 4: Die Attributsauswahl ist ungültig.");
    require(new Set(lp.career.attributes).size >= 2 && Math.max(0, ...ATTRIBUTE_KEYS.map((key) => lp.career.attributes.filter((item) => item === key).length)) <= 2, "Schritt 4: Verteile die Karrierepunkte auf zwei oder drei Attribute, höchstens zwei davon auf dasselbe.");
    if (career.tracks) require(Boolean(career.tracks.find((entry) => entry.id === lp.career.track)), "Schritt 4: Wähle einen Akademie-Track.");
    if (career.id !== "starfleet-enlisted") {
      const track = career.tracks?.find((entry) => entry.id === lp.career.track);
      const allowedMajors = track?.majors ?? career.majors;
      require(validKey(lp.career.majorDepartment, DEPARTMENT_KEYS) && allowedMajors.includes(lp.career.majorDepartment), "Schritt 4: Wähle eine zulässige Hauptdisziplin.");
      require(lp.career.minorDepartments.length === 2 && distinct(lp.career.minorDepartments) && lp.career.minorDepartments.every((key) => validKey(key, DEPARTMENT_KEYS) && key !== lp.career.majorDepartment), "Schritt 4: Wähle zwei verschiedene Nebendisziplinen.");
    }
    if (career.attributeRequirement) require(lp.career.attributes.includes(career.attributeRequirement), `Schritt 4: Mindestens ein Attribut muss ${ATTRIBUTE_LABELS[career.attributeRequirement]} sein.`);
    if (career.attributeRequirementAny) require(career.attributeRequirementAny.some((key) => lp.career.attributes.includes(key)), `Schritt 4: Mindestens ein Attribut muss ${career.attributeRequirementAny.map((key) => ATTRIBUTE_LABELS[key]).join(" oder ")} sein.`);
    require(Boolean(lp.career.trait.trim()), "Schritt 4: Trage das Berufstrait ein.");
    require(Boolean(lp.career.value.trim()), "Schritt 4: Trage einen Wert für den Karriereweg ein.");
    require(lp.career.focuses.length === 3 && lp.career.focuses.every((focus) => focus.trim()), "Schritt 4: Wähle drei Schwerpunkte.");
    require(Boolean(lp.career.talent.trim()), "Schritt 4: Wähle ein Talent.");
    if (lp.career.reallocation) {
      const selectedDepartments = [lp.career.majorDepartment, ...lp.career.minorDepartments];
      require(Boolean(career.reallocation), "Schritt 4: Dieser Karriereweg erlaubt keine Disziplinumverteilung.");
      require(validKey(lp.career.reallocation.from, DEPARTMENT_KEYS) && validKey(lp.career.reallocation.to, DEPARTMENT_KEYS), "Schritt 4: Die Disziplinumverteilung ist ungültig.");
      require(lp.career.reallocation.from !== lp.career.reallocation.to, "Schritt 4: Eine Disziplin kann nicht auf sich selbst umverteilt werden.");
      require(selectedDepartments.includes(lp.career.reallocation.from), "Schritt 4: Nur ein Disziplinpunkt aus der Karriereverteilung kann umverteilt werden.");
      require(!selectedDepartments.includes(lp.career.reallocation.to), "Schritt 4: Der zusätzliche Disziplinpunkt muss in eine andere Disziplin gehen.");
    }
  }
  require(lp.experience.value !== null, "Schritt 5: Wähle eine Erfahrungsstufe.");
  if (lp.experience.value) {
    require(Boolean(lp.experience.statement.trim()), "Schritt 5: Trage einen Wert passend zur Erfahrungsstufe ein.");
    if (lp.experience.value === "novice") require(validKey(lp.experience.noviceAttribute, ATTRIBUTE_KEYS), "Schritt 5: Untapped Potential benötigt ein ausgewähltes Attribut.");
    if (lp.experience.value === "experienced") require(Boolean(lp.experience.talent.trim()), "Schritt 5: Wähle ein Talent.");
    if (lp.experience.value === "veteran" && career?.military) {
      const normalizedRank = (rank ?? "").toLowerCase().replace(/[^a-z]/g, " ").replace(/\s+/g, " ").trim();
      const seniorOfficer = /lieutenant commander|lieutenant cmdr|lt commander|lt cmdr|commander|cmdr|captain|capt|admiral|adm/.test(normalizedRank);
      const seniorEnlisted = /chief petty officer|master chief|master chief petty officer|senior chief|cpo|mcpo|scpo/.test(normalizedRank);
      require(seniorOfficer || seniorEnlisted, "Veteranen benötigen mindestens den Rang Lieutenant Commander oder Chief Petty Officer.");
    }
  }
  const selectedEvents = lp.careerEvents.filter((eventSelection) => eventSelection?.id && careerEventByIdOrTitle(eventSelection.id));
  require(selectedEvents.length >= 2, "Schritt 6: Wähle mindestens zwei Karriereereignisse.");
  require(selectedEvents.filter((eventSelection) => eventSelection.attributeBonus).length === 2, "Schritt 6: Wähle genau zwei Attributboni aus den Karriereereignissen.");
  require(selectedEvents.filter((eventSelection) => eventSelection.departmentBonus).length === 2, "Schritt 6: Wähle genau zwei Disziplinboni aus den Karriereereignissen.");
  require(selectedEvents.filter((eventSelection) => eventSelection.focusBonus).length === 2, "Schritt 6: Wähle genau zwei Schwerpunkte aus den Karriereereignissen.");
  for (const eventSelection of selectedEvents) {
    const event = careerEventByIdOrTitle(eventSelection.id);
    require(event, "Schritt 6: Ein Karriereereignis ist ungültig.");
    if (!event) continue;
    const attribute = event.attribute === "any" ? eventSelection.attribute : event.attribute;
    const department = event.department === "any" ? eventSelection.department : event.department;
    if (eventSelection.attributeBonus) require(validKey(attribute, ATTRIBUTE_KEYS), `Schritt 6 (${event.title}): Wähle ein Attribut.`);
    if (eventSelection.departmentBonus) require(validKey(department, DEPARTMENT_KEYS), `Schritt 6 (${event.title}): Wähle eine Disziplin.`);
    if (eventSelection.focusBonus) require(Boolean(eventSelection.focus.trim()), `Schritt 6 (${event.title}): Wähle einen Schwerpunkt.`);
    require(!event.optionalTrait || !eventSelection.trait || eventSelection.trait.trim().length > 0, `Schritt 6 (${event.title}): Das optionale Trait ist ungültig.`);
  }
  require(Boolean(lp.finishing.value.trim()), "Schritt 7: Trage einen weiteren Wert ein.");
  require(Boolean(lp.finishing.talent.trim()), "Schritt 7: Wähle das vierte Talent.");
  require(lp.finishing.attributes.length === 2 && distinct(lp.finishing.attributes) && lp.finishing.attributes.every((key) => validKey(key, ATTRIBUTE_KEYS)), "Schritt 7: Wähle zwei verschiedene Attributsteigerungen.");
  require(lp.finishing.departments.length === 2 && distinct(lp.finishing.departments) && lp.finishing.departments.every((key) => validKey(key, DEPARTMENT_KEYS)), "Schritt 7: Wähle zwei verschiedene Disziplinsteigerungen.");

  const availableSpeciesAbilities = new Set(getSpeciesAbilityChoices(species).map((ability) => ability.value));
  require(stats.speciesAbilities.every((ability) => availableSpeciesAbilities.has(ability)), "Schritt 1: Eine gewählte Species Ability gehört nicht zu den ausgewählten Spezies.");
  for (const chosenSpecies of species) {
    const abilities = getSpeciesAbilityChoices([chosenSpecies]);
    if (abilities.length > 0) {
      require(abilities.some((ability) => stats.speciesAbilities.includes(ability.value)), `Schritt 1: Wähle mindestens eine Species Ability für ${chosenSpecies}.`);
    }
  }
  const role = findRoleOption(stats.characterRole);
  require(Boolean(stats.characterRole?.trim()), "Schritt 7: Wähle die Rolle des Charakters.");
  if (career?.military) require(Boolean(rank?.trim()), "Schritt 7: Militärische Charaktere benötigen einen Rang.");
  if (role?.id === "expert") {
    require(Boolean(lp.roleBonus.values[0]?.trim()), "Expert: Trage den zusätzlichen Wert ein.");
    require(Boolean(lp.roleBonus.focuses[0]?.trim()), "Expert: Wähle den zusätzlichen Schwerpunkt.");
  } else if (role?.id === "ships-doctor") {
    require(lp.roleBonus.focuses.slice(0, 2).every((focus) => focus.trim()), "Ship’s Doctor: Wähle zwei zusätzliche medizinische Schwerpunkte.");
  }
  if (stats.speciesAbilities.some((entry) => /denobulan.*breadth of study/i.test(entry))) {
    const start = role?.id === "expert" ? 1 : role?.id === "ships-doctor" ? 2 : 0;
    require(lp.roleBonus.focuses.slice(start, start + 2).every((focus) => focus.trim()), "Breadth of Study: Wähle zwei zusätzliche Schwerpunkte.");
  }

  const rebuilt = applySta2eLifepath(stats, species);
  require(rebuilt.values.length >= 4, "Der Lifepath benötigt mindestens vier Werte.");
  require(rebuilt.talents.length >= 4, "Der Lifepath benötigt mindestens vier Talente.");
  require(rebuilt.focuses.length >= 6, "Der Lifepath benötigt mindestens sechs Schwerpunkte.");
  require(rebuilt.attributes && ATTRIBUTE_KEYS.every((key) => rebuilt.attributes[key] !== null), "Attribute liegen außerhalb der zulässigen Werte und müssen umverteilt werden.");
  require(rebuilt.departments && DEPARTMENT_KEYS.every((key) => rebuilt.departments[key] !== null), "Disziplinen liegen außerhalb der zulässigen Werte und müssen umverteilt werden.");
  if (lp.experience.value === "novice") {
    require(rebuilt.attributes && ATTRIBUTE_KEYS.every((key) => (rebuilt.attributes[key] ?? 99) <= 11), "Neulinge dürfen kein Attribut über 11 haben; verschiebe Punkte im Abschluss-Schritt.");
    require(rebuilt.departments && DEPARTMENT_KEYS.every((key) => (rebuilt.departments[key] ?? 99) <= 4), "Neulinge dürfen keine Disziplin über 4 haben; verschiebe Punkte im Abschluss-Schritt.");
  }
  require(lp.corrections.length <= 24 && lp.corrections.every((entry) =>
    entry.kind === "attribute"
      ? validKey(entry.from, ATTRIBUTE_KEYS) && validKey(entry.to, ATTRIBUTE_KEYS) && entry.from !== entry.to
      : validKey(entry.from, DEPARTMENT_KEYS) && validKey(entry.to, DEPARTMENT_KEYS) && entry.from !== entry.to,
  ), "Schritt 7: Eine Punktumverteilung ist ungültig.");
  const statErrors = validateCharacterStats(rebuilt);
  errors.push(...statErrors);
  if (rebuilt.attributes && ATTRIBUTE_KEYS.reduce((sum, key) => sum + (rebuilt.attributes[key] ?? 0), 0) !== 56) errors.push("STA-2e-Lifepath: Die Attributsumme muss 56 betragen.");
  if (rebuilt.departments && DEPARTMENT_KEYS.reduce((sum, key) => sum + (rebuilt.departments[key] ?? 0), 0) !== 16) errors.push("STA-2e-Lifepath: Die Disziplinensumme muss 16 betragen.");
  const expectedValues = 4 + (role?.id === "expert" ? 1 : 0);
  const expectedFocuses = 6 + (role?.id === "expert" ? 1 : 0) + (role?.id === "ships-doctor" ? 2 : 0) + (stats.speciesAbilities.some((entry) => /denobulan.*breadth of study/i.test(entry)) ? 2 : 0);
  if (rebuilt.values.length !== expectedValues) errors.push(`STA-2e-Lifepath: ${expectedValues} Werte sind erforderlich.`);
  if (rebuilt.talents.length !== 4) errors.push("STA-2e-Lifepath: Vier Talente sind erforderlich.");
  if (rebuilt.focuses.length !== expectedFocuses) errors.push(`STA-2e-Lifepath: ${expectedFocuses} Schwerpunkte sind erforderlich.`);
  return [...new Set(errors)];
}

export function careerEventAttributeChoices(eventId: string): AttributeKey[] {
  const event = careerEventByIdOrTitle(eventId);
  if (!event) return [];
  return event.attribute === "any" ? ATTRIBUTE_KEYS : [event.attribute];
}

export function careerEventDepartmentChoices(eventId: string): DepartmentKey[] {
  const event = careerEventByIdOrTitle(eventId);
  if (!event) return [];
  return event.department === "any" ? DEPARTMENT_KEYS : [event.department];
}

export function characterExperienceLabel(value: CharacterExperience | null): string {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}
