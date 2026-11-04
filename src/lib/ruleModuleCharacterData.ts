import type { RuleModuleCharacterData } from "@/types/characterStats";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";

export function sanitizeRuleModuleCharacterData(
  definition: RuleModuleDefinition,
  input: RuleModuleCharacterData,
  earnedAp = 0,
): RuleModuleCharacterData {
  const resources = Object.fromEntries(
    definition.resources
      .filter((resource) => !(definition.id === "technomage" && resource.id === "power-points"))
      .flatMap((resource) => {
        const value = input.resources[resource.id];
        return Number.isInteger(value) && value >= 0 && value <= 999_999
          ? [[resource.id, value]]
          : [];
      }),
  );
  const talents = new Map(definition.talents.map((talent) => [talent.id, talent]));
  const selectedTalents: string[] = [];
  for (const talentId of input.selectedTalents) {
    const talent = talents.get(talentId);
    if (!talent) continue;
    if (talent.repeatable) {
      if (selectedTalents.filter((id) => id === talentId).length < 20) {
        selectedTalents.push(talentId);
      }
    } else if (!selectedTalents.includes(talentId)) {
      selectedTalents.push(talentId);
    }
  }

  const selectedStatuses = [...new Set(input.selectedStatuses)].filter((id) =>
    definition.statuses.some((status) => status.id === id),
  );
  const selectedCollectionEntries = Object.fromEntries(
    definition.collections.map((collection) => {
      const allowed = new Set(collection.entries.map((entry) => entry.id));
      return [collection.id, [...new Set(input.selectedCollectionEntries[collection.id] ?? [])].filter((id) => allowed.has(id))];
    }),
  );
  const prestige = definition.prestigeClasses.find((item) => item.id === input.prestigeClass);
  const prestigeAbilities = prestige
    ? [...new Set(input.prestigeAbilities)].filter((id) =>
        prestige.abilities.some((ability) => ability.id === id && ability.ap <= earnedAp),
      )
    : [];

  return {
    resources,
    selectedTalents,
    selectedStatuses,
    selectedCollectionEntries,
    prestigeClass: prestige?.id ?? null,
    prestigeAbilities,
  };
}
