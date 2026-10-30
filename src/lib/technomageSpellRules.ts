import type { TechnomageSchool } from "@/types/characterStats";
import {
  TECHNOMAGE_SCHOOLS,
  TECHNOMAGE_SPELLS,
  getTechnomageSpell,
  spellPrerequisiteGroups,
} from "@/lib/technomageSpellCatalog";

// XP-Schwellen des d20-Systems, umgerechnet mit 150 XP je AP. So liegt die
// Schwelle zu Stufe 4 bei 40 AP und die Abstände wachsen danach wie im d20.
const D20_XP_THRESHOLDS = [
  0, 1_000, 3_000, 6_000, 10_000, 15_000, 21_000, 28_000, 36_000, 45_000,
  55_000, 66_000, 78_000, 91_000, 105_000, 120_000, 136_000, 153_000,
  171_000, 190_000,
] as const;

export const TECHNOMAGE_AP_THRESHOLDS = D20_XP_THRESHOLDS.map((xp) =>
  Math.ceil(xp / 150),
);

export function technomageLevelFromAp(earnedAp: number): number {
  const ap = Number.isFinite(earnedAp) ? Math.max(0, Math.floor(earnedAp)) : 0;
  let level = 1;
  for (let index = 1; index < TECHNOMAGE_AP_THRESHOLDS.length; index += 1) {
    if (ap < TECHNOMAGE_AP_THRESHOLDS[index]) break;
    level = index + 1;
  }
  return level;
}

export function technomageApForLevel(level: number): number | null {
  if (!Number.isInteger(level) || level < 1 || level > 20) return null;
  return TECHNOMAGE_AP_THRESHOLDS[level - 1];
}

// Reason/Verstand übernimmt die Rolle von Intelligenz, Fitness die von
// Konstitution und Präsenz die von Charisma. Fehlende STA-Werte zählen neutral.
export function technomageAbilityModifier(score: number | null): number {
  return score === null || !Number.isFinite(score)
    ? 0
    : Math.floor((score - 10) / 2);
}

function expectedDie(sides: number): number {
  return (sides + 1) / 2;
}

const SPELL_LEVELS_WITHOUT_D4 = new Set([7, 10, 13, 16, 19, 20]);
const SPELL_LEVELS_WITHOUT_CHARISMA_D4 = new Set([5, 10, 15, 20]);

// Das Fact Book gibt neue Spells und PP als Würfelwürfe an. Die Runde würfelt
// nicht beim Stufenaufstieg, daher werden Erwartungswerte kumuliert und erst
// am Ende gerundet. Das vermeidet sprunghafte Werte bei erneutem Laden.
export function technomageKnownSpellLimit(
  level: number,
  reason: number | null,
): number {
  const boundedLevel = Math.max(1, Math.min(20, Math.floor(level)));
  const modifier = technomageAbilityModifier(reason);
  let total = 5 + expectedDie(4) + modifier;
  for (let gainedAt = 2; gainedAt <= boundedLevel; gainedAt += 1) {
    total += SPELL_LEVELS_WITHOUT_D4.has(gainedAt)
      ? Math.max(0, modifier)
      : expectedDie(4) + modifier;
  }
  return Math.max(0, Math.round(total));
}

export function technomagePowerPointMaximum(
  level: number,
  fitness: number | null,
  presence: number | null,
): number {
  const boundedLevel = Math.max(1, Math.min(20, Math.floor(level)));
  const constitution = technomageAbilityModifier(fitness);
  const charisma = technomageAbilityModifier(presence);
  let total = 10 + expectedDie(6) + constitution + charisma;
  for (let gainedAt = 2; gainedAt <= boundedLevel; gainedAt += 1) {
    total += expectedDie(4) + charisma;
    if (SPELL_LEVELS_WITHOUT_CHARISMA_D4.has(gainedAt)) total += 3;
  }
  return Math.max(0, Math.round(total));
}

export function effectiveTechnomagePowerPoints(
  current: number | null,
  maximumAtLastUpdate: number | null,
  currentMaximum: number,
): number {
  if (current === null) return currentMaximum;
  const adjusted =
    currentMaximum - (maximumAtLastUpdate ?? currentMaximum) + current;
  return Math.max(0, Math.min(currentMaximum, adjusted));
}

export function technomageRecoveryIntervalMinutes(
  activity: "meditation" | "light" | "strenuous",
  maintainedSpellCount: number,
): number {
  const interval = activity === "meditation" ? 10 : activity === "light" ? 30 : 60;
  return interval * (Math.max(0, Math.floor(maintainedSpellCount)) + 1);
}

export function calculateTechnomagePowerPointRecovery(input: {
  current: number;
  maximum: number;
  durationMinutes: number;
  activity: "meditation" | "light" | "strenuous";
  maintainedSpellCount: number;
  progress: number;
}): { current: number; recovered: number; progress: number } {
  if (input.current >= input.maximum) {
    return { current: input.maximum, recovered: 0, progress: 0 };
  }
  const interval = technomageRecoveryIntervalMinutes(
    input.activity,
    input.maintainedSpellCount,
  );
  const accumulated = Math.max(0, Math.min(0.999999, input.progress)) +
    input.durationMinutes / interval;
  const recovered = Math.floor(accumulated + Number.EPSILON);
  const current = Math.min(input.maximum, input.current + recovered);
  return {
    current,
    recovered: current - input.current,
    progress: current >= input.maximum ? 0 : accumulated - recovered,
  };
}

export interface SpellPurchasePlanInput {
  spellId: string;
  knownSpellIds: readonly string[];
  knownSpellLimit: number;
  primarySchool: TechnomageSchool | null;
  weakSchools: readonly TechnomageSchool[];
}

export type SpellPurchasePlan =
  | { ok: true; spellIds: string[] }
  | { ok: false; error: string };

function primarySchoolRequirement(spellId: string): TechnomageSchool | null {
  const spell = getTechnomageSpell(spellId);
  if (!spell) return null;
  const requirements = spell.requirements.toLowerCase();
  if (!/as a primary (aptitude|school)/.test(requirements)) return null;

  const school = TECHNOMAGE_SCHOOLS.find((entry) =>
    requirements.includes(entry.original.toLowerCase()),
  );
  return school?.id ?? null;
}

function requiredKnownCount(spellId: string): number {
  const spell = getTechnomageSpell(spellId);
  const match = spell?.requirements.match(
    /at least\s+(\d+)\s+(?:other\s+)?chaos spells/i,
  );
  return match ? Number(match[1]) : 0;
}

export function createSpellPurchasePlan(
  input: SpellPurchasePlanInput,
): SpellPurchasePlan {
  const target = getTechnomageSpell(input.spellId);
  if (!target) return { ok: false, error: "Dieser Spell ist nicht verfügbar." };
  const known = new Set(input.knownSpellIds);
  if (known.has(input.spellId)) {
    return { ok: false, error: "Dieser Spell ist bereits gelernt." };
  }
  if (!input.primarySchool || input.weakSchools.length !== 3) {
    return {
      ok: false,
      error: "Lege zuerst eine Primärschule und drei schwache Schulen fest.",
    };
  }

  const planned = new Set<string>();
  const visiting = new Set<string>();
  let failure: string | null = null;

  const collect = (spellId: string): boolean => {
    if (known.has(spellId) || planned.has(spellId)) return true;
    const spell = getTechnomageSpell(spellId);
    if (!spell) return true;
    if (visiting.has(spellId)) {
      failure = "Im Spell-Baum gibt es einen widersprüchlichen Kreis.";
      return false;
    }

    const requiredPrimary = primarySchoolRequirement(spellId);
    if (requiredPrimary && input.primarySchool !== requiredPrimary) {
      failure =
        spell.name +
        " setzt " +
        (TECHNOMAGE_SCHOOLS.find((school) => school.id === requiredPrimary)
          ?.label ?? requiredPrimary) +
        " als Primärschule voraus.";
      return false;
    }

    visiting.add(spellId);
    for (const group of spellPrerequisiteGroups(spellId)) {
      if (group.some((dependency) => known.has(dependency) || planned.has(dependency))) {
        continue;
      }

      let satisfied = false;
      const options = [...group].sort((a, b) => {
        const aKnown = known.has(a) || planned.has(a) ? 0 : 1;
        const bKnown = known.has(b) || planned.has(b) ? 0 : 1;
        return aKnown - bKnown;
      });
      for (const dependency of options) {
        const plannedBefore = new Set(planned);
        const visitingBefore = new Set(visiting);
        if (collect(dependency)) {
          satisfied = true;
          break;
        }
        planned.clear();
        for (const id of plannedBefore) planned.add(id);
        visiting.clear();
        for (const id of visitingBefore) visiting.add(id);
        failure = null;
      }
      if (!satisfied) {
        visiting.delete(spellId);
        if (!failure) {
          failure =
            "Eine Voraussetzung für " +
            spell.name +
            " kann nicht gelernt werden.";
        }
        return false;
      }
    }

    const minimumKnown = requiredKnownCount(spellId);
    if (minimumKnown > 0 && known.size + planned.size < minimumKnown) {
      visiting.delete(spellId);
      failure =
        spell.name +
        " setzt mindestens " +
        minimumKnown +
        " bereits gelernte Spells voraus.";
      return false;
    }

    visiting.delete(spellId);
    planned.add(spellId);
    return true;
  };

  if (!collect(input.spellId)) {
    return {
      ok: false,
      error: failure ?? "Die Voraussetzungen dieses Spells sind nicht erfüllt.",
    };
  }

  const available = Math.max(0, input.knownSpellLimit - known.size);
  if (planned.size > available) {
    return {
      ok: false,
      error:
        "Es fehlen " +
        (planned.size - available) +
        " bekannte Spell(s) an Kapazität (benötigt: " +
        planned.size +
        ", verfügbar: " +
        available +
        ").",
    };
  }
  return { ok: true, spellIds: [...planned] };
}

export function getSpellPurchaseSlotCost(
  input: Omit<SpellPurchasePlanInput, "knownSpellLimit">,
): number | null {
  const plan = createSpellPurchasePlan({
    ...input,
    knownSpellLimit: input.knownSpellIds.length + TECHNOMAGE_SPELLS.length,
  });
  return plan.ok ? plan.spellIds.length : null;
}

export function spellTreeDepth(
  spellId: string,
  school: TechnomageSchool,
  visited: ReadonlySet<string> = new Set(),
): number {
  const spell = getTechnomageSpell(spellId);
  if (!spell) return 0;
  const localDependencies = spellPrerequisiteGroups(spellId)
    .flat()
    .filter((id) => getTechnomageSpell(id)?.school === school);
  if (visited.has(spellId) || localDependencies.length === 0) return 0;
  const nextVisited = new Set(visited);
  nextVisited.add(spellId);
  return (
    1 +
    Math.max(
      ...localDependencies.map((id) =>
        spellTreeDepth(id, school, nextVisited),
      ),
    )
  );
}
