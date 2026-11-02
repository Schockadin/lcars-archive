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
  schools: {
    id: TechnomageSchool;
    label: string;
    original: string;
  }[];
  spells: TechnomageSpell[];
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
  const schools = value.schools;
  const spells = value.spells;
  if (
    !Array.isArray(rules) || rules.length > 100 || !uniqueIds(rules) ||
    !Array.isArray(resources) || resources.length > 100 || !uniqueIds(resources) ||
    !Array.isArray(statuses) || statuses.length > 100 || !uniqueIds(statuses) ||
    !Array.isArray(talents) || talents.length > 500 || !uniqueIds(talents) ||
    !Array.isArray(prestigeClasses) || prestigeClasses.length > 100 || !uniqueIds(prestigeClasses) ||
    !Array.isArray(schools) || schools.length > 30 || !uniqueIds(schools) ||
    !Array.isArray(spells) || spells.length > 2000 || !uniqueIds(spells)
  ) return null;
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
  return raw as RuleModuleDefinition;
}

