import { describe, expect, it } from "vitest";
import {
  DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
  parseTechnomageSpellSlotRules,
  validateTechnomageSpellSlotRules,
} from "@/lib/technomageSpellSlotRules";

describe("Technomage spell-slot rule settings", () => {
  it("uses defaults for missing or invalid saved values", () => {
    expect(
      parseTechnomageSpellSlotRules({
        creationBaseSlots: 8,
        apThreshold: 0,
        reasonModifier: "invalid",
      }),
    ).toEqual({
      ...DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
      creationBaseSlots: 8,
    });
  });

  it("accepts decimal slot grants and requires whole-number thresholds", () => {
    const valid = validateTechnomageSpellSlotRules({
      creationBaseSlots: "5",
      creationBonusSlots: "2.5",
      reasonBaseline: "7",
      reasonModifier: "1",
      organellesBonusSlots: "2.5",
      ftlAttunementBonusSlots: "2.5",
      apThreshold: "20",
      apBonusSlots: "2.5",
    });
    expect(valid).toEqual({
      ok: true,
      value: DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
    });
    const invalid = validateTechnomageSpellSlotRules({
      creationBaseSlots: "5",
      creationBonusSlots: "2.5",
      reasonBaseline: "7",
      reasonModifier: "1",
      organellesBonusSlots: "2.5",
      ftlAttunementBonusSlots: "2.5",
      apThreshold: "20.5",
      apBonusSlots: "2.5",
    });
    expect(invalid.ok).toBe(false);
  });
});
