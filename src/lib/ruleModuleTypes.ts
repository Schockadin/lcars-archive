import type { TechnomageSchool } from "@/types/characterStats";
import type { TechnomageSpell } from "@/lib/technomageSpellCatalog";

export interface RuleModuleRule {
  id: string;
  title: string;
  body: string;
}

export interface RuleModuleTalent {
  id: string;
  name: string;
  category: string;
  requirements: string;
  description: string;
  repeatable?: boolean;
}

export interface RuleModulePrestigeAbility extends RuleModuleTalent {
  rank: number;
  ap: number;
}

export interface RuleModulePrestigeClass {
  id: string;
  name: string;
  description: string;
  requirements: string;
  abilities: RuleModulePrestigeAbility[];
}

export interface RuleModuleResource {
  id: string;
  name: string;
  abbreviation: string;
  maximum: string;
}

export interface RuleModuleStatus {
  id: string;
  label: string;
}

export type RuleModuleCollectionFieldType = "text" | "number" | "checkbox" | "select";

export interface RuleModuleCollectionField {
  id: string;
  label: string;
  type: RuleModuleCollectionFieldType;
  options: string[];
}

export interface RuleModuleCollectionEntry {
  id: string;
  name: string;
  values: Record<string, string | number | boolean>;
}

/** A user-defined list, such as powers, equipment, forms, or faction benefits. */
export interface RuleModuleCollection {
  id: string;
  title: string;
  description: string;
  fields: RuleModuleCollectionField[];
  entries: RuleModuleCollectionEntry[];
}

export interface RuleModuleDefinition {
  id: string;
  name: string;
  summary: string;
  characterRoles: string[];
  rules: RuleModuleRule[];
  resources: RuleModuleResource[];
  statuses: RuleModuleStatus[];
  talents: RuleModuleTalent[];
  prestigeClasses: RuleModulePrestigeClass[];
  collections: RuleModuleCollection[];
  schools: {
    id: TechnomageSchool;
    label: string;
    original: string;
  }[];
  spells: TechnomageSpell[];
  /** Opt a module into a dedicated tab on matching character sheets. */
  characterTab?: {
    enabled: boolean;
    label: string;
  };
}

/** Shared role matching for server pages and client-side character creation. */
export function moduleSupportsCharacterRole(
  definition: RuleModuleDefinition,
  role: string | null,
): boolean {
  if (!role) return definition.characterRoles.some((item) => item.trim() === "*");
  const normalize = (value: string) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const candidate = normalize(role);
  return definition.characterRoles.some((item) => {
    if (item.trim() === "*") return true;
    const expected = normalize(item);
    return candidate === expected ||
      (expected.length >= 5 && candidate.includes(expected));
  });
}

export interface CampaignRuleModule {
  enabled: boolean;
  definition: RuleModuleDefinition;
  updatedAt: string | null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function entriesHaveStrings(
  entries: unknown[],
  fields: readonly string[],
): boolean {
  return entries.every((entry) => {
    const item = record(entry);
    return !!item && fields.every((field) => typeof item[field] === "string");
  });
}

function uniqueIds(entries: unknown[]): boolean {
  const ids = entries.map((entry) => record(entry)?.id);
  return ids.every((id) => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/i.test(id)) &&
    new Set(ids).size === ids.length;
}

/** Structural gate for editable campaign JSON, shared by the GM action and unit tests. */
export function validateRuleModuleDefinition(
  raw: unknown,
  expectedId: string,
): RuleModuleDefinition | null {
  const value = record(raw);
  if (!value || value.id !== expectedId) return null;
  if (
    typeof value.name !== "string" || value.name.trim().length === 0 || value.name.length > 200 ||
    typeof value.summary !== "string" || value.summary.length > 2000 ||
    !Array.isArray(value.characterRoles) || value.characterRoles.length === 0 ||
    !value.characterRoles.every((role) => typeof role === "string" && role.trim().length > 0 && role.length <= 100)
  ) return null;

  const rules = value.rules;
  const resources = value.resources;
  const statuses = value.statuses;
  const talents = value.talents;
  const prestigeClasses = value.prestigeClasses;
  const collections = value.collections ?? [];
  const characterTab = value.characterTab;
  const tabConfig = characterTab === undefined ? null : record(characterTab);
  const schools = value.schools;
  const spells = value.spells;
  if (
    !Array.isArray(rules) || rules.length > 100 || !uniqueIds(rules) ||
    !Array.isArray(resources) || resources.length > 100 || !uniqueIds(resources) ||
    !Array.isArray(statuses) || statuses.length > 100 || !uniqueIds(statuses) ||
    !Array.isArray(talents) || talents.length > 500 || !uniqueIds(talents) ||
    !Array.isArray(prestigeClasses) || prestigeClasses.length > 100 || !uniqueIds(prestigeClasses) ||
    !Array.isArray(collections) || collections.length > 100 || !uniqueIds(collections) ||
    !Array.isArray(schools) || schools.length > 30 || !uniqueIds(schools) ||
    !Array.isArray(spells) || spells.length > 2000 || !uniqueIds(spells)
  ) return null;
  if (characterTab !== undefined && (
    !tabConfig || typeof tabConfig.enabled !== "boolean" ||
    typeof tabConfig.label !== "string" || tabConfig.label.length > 80 ||
    (tabConfig.enabled && tabConfig.label.trim().length === 0)
  )) return null;
  if (expectedId === "technomage" && schools.length === 0) return null;
  if (!entriesHaveStrings(rules, ["id", "title", "body"])) return null;
  if (!entriesHaveStrings(resources, ["id", "name", "abbreviation", "maximum"])) return null;
  if (!entriesHaveStrings(statuses, ["id", "label"])) return null;
  if (!entriesHaveStrings(talents, ["id", "name", "category", "requirements", "description"])) return null;
  if (!talents.every((entry) => {
    const item = record(entry);
    return !!item && (item.repeatable === undefined || typeof item.repeatable === "boolean");
  })) return null;
  if (!entriesHaveStrings(schools, ["id", "label", "original"])) return null;
  if (!entriesHaveStrings(prestigeClasses, ["id", "name", "description", "requirements"])) return null;
  if (!collections.every((entry) => {
    const collection = record(entry);
    if (!collection || typeof collection.title !== "string" || collection.title.trim().length === 0 ||
      collection.title.length > 120 || typeof collection.description !== "string" ||
      collection.description.length > 2000 || !Array.isArray(collection.fields) ||
      collection.fields.length > 30 || !uniqueIds(collection.fields) ||
      !Array.isArray(collection.entries) || collection.entries.length > 500 ||
      !uniqueIds(collection.entries)) return false;

    const fields = collection.fields as unknown[];
    if (!fields.every((field) => {
      const item = record(field);
      if (!item || typeof item.label !== "string" || item.label.trim().length === 0 ||
        item.label.length > 120 || !["text", "number", "checkbox", "select"].includes(String(item.type)) ||
        !Array.isArray(item.options) || item.options.length > 50 ||
        !item.options.every((option) => typeof option === "string" && option.length <= 120)) return false;
      return item.type !== "select" || item.options.length > 0;
    })) return false;

    const fieldTypes = new Map(fields.map((field) => {
      const item = record(field)!;
      return [String(item.id), item.type] as const;
    }));
    return (collection.entries as unknown[]).every((entryValue) => {
      const item = record(entryValue);
      const values = item ? record(item.values) : null;
      if (!item || typeof item.name !== "string" || item.name.trim().length === 0 ||
        item.name.length > 200 || !values) return false;
      return Object.entries(values).every(([fieldId, fieldValue]) => {
        const type = fieldTypes.get(fieldId);
        if (!type) return false;
        if (type === "text") return typeof fieldValue === "string" && fieldValue.length <= 4000;
        if (type === "number") return typeof fieldValue === "number" && Number.isFinite(fieldValue);
        if (type === "checkbox") return typeof fieldValue === "boolean";
        const field = fields.find((candidate) => record(candidate)?.id === fieldId);
        const options = record(field)?.options;
        return typeof fieldValue === "string" && Array.isArray(options) && options.includes(fieldValue);
      });
    });
  })) return null;
  const schoolIds = new Set(schools.map((entry) => record(entry)?.id));
  const spellEffects = new Set([
    "attack", "concealment", "crafting", "creation", "defence", "enhancement",
    "healing", "illusion", "manipulation", "movement", "perception", "protection",
    "summoning", "utility",
  ]);
  if (!spells.every((entry) => {
    const item = record(entry);
    if (!item || typeof item.name !== "string" || typeof item.requirements !== "string") return false;
    if (!schoolIds.has(item.school) || typeof item.effect !== "string" || !spellEffects.has(item.effect)) return false;
    if (item.sourceMageryDc !== null && (typeof item.sourceMageryDc !== "number" || !Number.isFinite(item.sourceMageryDc))) return false;
    if (!Number.isInteger(item.sourcePage) || Number(item.sourcePage) < 1) return false;
    for (const field of ["sourceCastingTime", "sourceCastingCost", "sourceMaintenanceCost", "sourceRange", "sourceTarget", "sourceDuration", "elementalCategory"]) {
      if (item[field] !== undefined && item[field] !== null && typeof item[field] !== "string") return false;
    }
    return true;
  })) return null;
  for (const entry of prestigeClasses) {
    const item = record(entry);
    if (!item || !Array.isArray(item.abilities) || item.abilities.length > 20 || !uniqueIds(item.abilities)) return null;
    if (!entriesHaveStrings(item.abilities, ["id", "name", "category", "requirements", "description"])) return null;
    if (!item.abilities.every((ability) => {
      const row = record(ability);
      return !!row && Number.isInteger(row.rank) && Number(row.rank) >= 1 && Number(row.rank) <= 10 &&
        Number.isInteger(row.ap) && Number(row.ap) >= 0;
    })) return null;
  }
  return {
    ...value,
    collections,
    ...(characterTab === undefined && expectedId === "technomage"
      ? { characterTab: { enabled: true, label: "Technomage" } }
      : {}),
  } as unknown as RuleModuleDefinition;
}

