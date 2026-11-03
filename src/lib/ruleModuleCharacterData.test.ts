import { describe, expect, it } from "vitest";
import type { RuleModuleDefinition } from "./ruleModuleTypes";
import { sanitizeRuleModuleCharacterData } from "./ruleModuleCharacterData";

const definition: RuleModuleDefinition = {
  id: "example",
  name: "Example",
  summary: "",
  characterRoles: ["*"],
  rules: [],
  resources: [{ id: "charge", name: "Charge", abbreviation: "CH", maximum: "6" }],
  statuses: [{ id: "attuned", label: "Attuned" }],
  talents: [
    { id: "gift", name: "Gift", category: "general", requirements: "—", description: "", repeatable: true },
    { id: "focus", name: "Focus", category: "general", requirements: "—", description: "" },
  ],
  prestigeClasses: [{
    id: "adept",
    name: "Adept",
    description: "",
    requirements: "",
    abilities: [{ id: "rank-one", name: "Rank One", category: "prestige", requirements: "", description: "", rank: 1, ap: 10 }],
  }],
  collections: [{
    id: "forms",
    title: "Forms",
    description: "",
    fields: [],
    entries: [{ id: "quick", name: "Quick", values: {} }],
  }],
  schools: [],
  spells: [],
  characterTab: { enabled: true, label: "Example" },
};

describe("sanitizeRuleModuleCharacterData", () => {
  it("keeps only valid module choices and enforces repeat and AP limits", () => {
    const saved = sanitizeRuleModuleCharacterData(definition, {
      resources: { charge: 3, unknown: 99 },
      selectedTalents: ["gift", "gift", "focus", "focus", "unknown"],
      selectedStatuses: ["attuned", "invalid"],
      selectedCollectionEntries: { forms: ["quick", "missing"] },
      prestigeClass: "adept",
      prestigeAbilities: ["rank-one"],
    });

    expect(saved).toEqual({
      resources: { charge: 3 },
      selectedTalents: ["gift", "gift", "focus"],
      selectedStatuses: ["attuned"],
      selectedCollectionEntries: { forms: ["quick"] },
      prestigeClass: "adept",
      prestigeAbilities: [],
    });
  });
});
