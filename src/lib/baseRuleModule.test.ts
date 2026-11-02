import { describe, expect, it } from "vitest";
import { BASE_RULE_MODULE, BASE_RULE_MODULE_ID } from "@/lib/baseRuleModule";
import { validateRuleModuleDefinition } from "@/lib/ruleModuleTypes";

describe("STA 2e-Basismodul", () => {
  it("ist ein gültiges, kampagnenweites Regelmodul mit Grundregeln", () => {
    expect(BASE_RULE_MODULE_ID).toBe("sta2e");
    expect(BASE_RULE_MODULE.characterRoles).toEqual(["*"]);
    expect(BASE_RULE_MODULE.rules.map((rule) => rule.id)).toContain("task-resolution");
    expect(validateRuleModuleDefinition(BASE_RULE_MODULE, BASE_RULE_MODULE_ID)).toEqual(BASE_RULE_MODULE);
  });
});
