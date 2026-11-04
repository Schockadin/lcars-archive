import { describe, expect, it } from "vitest";
import { TECHNOMAGE_RULE_MODULE } from "@/lib/technomageRuleModule";
import { validateRuleModuleDefinition } from "@/lib/ruleModuleTypes";

describe("Technomage STA 2e rule module", () => {
  it("contains the full seven-school spell catalog, talent list, and six prestige paths", () => {
    expect(TECHNOMAGE_RULE_MODULE.schools).toHaveLength(7);
    expect(TECHNOMAGE_RULE_MODULE.spells).toHaveLength(289);
    expect(TECHNOMAGE_RULE_MODULE.talents).toHaveLength(36);
    expect(TECHNOMAGE_RULE_MODULE.prestigeClasses).toHaveLength(6);
    expect(TECHNOMAGE_RULE_MODULE.prestigeClasses.every((path) => path.abilities.length === 10)).toBe(true);
    expect(TECHNOMAGE_RULE_MODULE.rules.length).toBeGreaterThanOrEqual(15);
  });

  it("validates the saved editable module format and rejects malformed definitions", () => {
    expect(validateRuleModuleDefinition(TECHNOMAGE_RULE_MODULE, "technomage")).toEqual(
      TECHNOMAGE_RULE_MODULE,
    );
    expect(validateRuleModuleDefinition(TECHNOMAGE_RULE_MODULE, "other-module")).toBeNull();
    expect(validateRuleModuleDefinition({ ...TECHNOMAGE_RULE_MODULE, spells: [{ id: "broken" }] }, "technomage")).toBeNull();
    expect(validateRuleModuleDefinition({ ...TECHNOMAGE_RULE_MODULE, schools: [] }, "technomage")).toBeNull();
  });

  it("enables the Technomage character tab for existing saved module definitions", () => {
    const legacy = { ...TECHNOMAGE_RULE_MODULE, characterTab: undefined };
    expect(validateRuleModuleDefinition(legacy, "technomage")?.characterTab).toEqual({
      enabled: true,
      label: "Technomage",
    });
    expect(validateRuleModuleDefinition({
      ...TECHNOMAGE_RULE_MODULE,
      characterTab: { enabled: true, label: "" },
    }, "technomage")).toBeNull();
  });

  it("accepts a reusable campaign module with only custom rules and resources", () => {
    const definition = {
      id: "xenobiology",
      name: "Xenobiologie",
      summary: "Zusatzregeln für xenobiologische Forschung.",
      characterRoles: ["Science"],
      rules: [{ id: "field-research", title: "Feldforschung", body: "Regeltext" }],
      resources: [{ id: "samples", name: "Proben", abbreviation: "PR", maximum: "Spezial" }],
      statuses: [],
      talents: [],
      prestigeClasses: [],
      collections: [],
      schools: [],
      spells: [],
    };
    expect(validateRuleModuleDefinition(definition, "xenobiology")).toEqual(definition);
  });

  it("validates independent module catalogs with typed fields and selectable entries", () => {
    const definition = {
      id: "xenobiology",
      name: "Xenobiologie",
      summary: "Forschungserweiterung.",
      characterRoles: ["*"],
      rules: [],
      resources: [],
      statuses: [],
      talents: [],
      prestigeClasses: [],
      collections: [{
        id: "research-tools",
        title: "Forschungswerkzeuge",
        description: "Freigeschaltete Ausrüstung.",
        fields: [
          { id: "quality", label: "Qualität", type: "select", options: ["Standard", "Erweitert"] },
          { id: "charges", label: "Ladungen", type: "number", options: [] },
        ],
        entries: [{ id: "scanner", name: "Bioscanner", values: { quality: "Erweitert", charges: 3 } }],
      }],
      schools: [],
      spells: [],
    };
    expect(validateRuleModuleDefinition(definition, "xenobiology")).toEqual(definition);
    expect(validateRuleModuleDefinition({
      ...definition,
      collections: [{ ...definition.collections[0], entries: [{ id: "scanner", name: "Bioscanner", values: { quality: "Unbekannt", charges: 3 } }] }],
    }, "xenobiology")).toBeNull();
  });
});
