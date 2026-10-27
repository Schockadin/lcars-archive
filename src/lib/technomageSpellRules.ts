import type { TechnomageSchool } from "@/types/characterStats";
import {
  TECHNOMAGE_SCHOOLS,
  getTechnomageSpell,
  spellPrerequisiteGroups,
} from "@/lib/technomageSpellCatalog";

export interface SpellPurchasePlanInput {
  spellId: string;
  knownSpellIds: readonly string[];
  slotTotal: number;
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

  const available = Math.max(0, input.slotTotal - known.size);
  if (planned.size > available) {
    return {
      ok: false,
      error:
        "Es fehlen " +
        (planned.size - available) +
        " Spellplatz/Spellplätze (benötigt: " +
        planned.size +
        ", verfügbar: " +
        available +
        ").",
    };
  }
  return { ok: true, spellIds: [...planned] };
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
