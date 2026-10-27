import { describe, expect, it } from "vitest";
import {
  TECHNOMAGE_SCHOOLS,
  TECHNOMAGE_SPELLS,
  getTechnomageSpell,
  isTechnomageRole,
  spellPrerequisiteGroups,
  technomageSpellExplanation,
  technomageSpellSlotTotal,
} from "@/lib/technomageSpellCatalog";
import { createSpellPurchasePlan } from "@/lib/technomageSpellRules";

const schools = ["elements", "movement", "creation"] as const;

describe("Technomage spell catalog", () => {
  it("contains all 289 Fact Book spells across the seven schools", () => {
    expect(TECHNOMAGE_SCHOOLS).toHaveLength(7);
    expect(TECHNOMAGE_SPELLS).toHaveLength(289);
    expect(new Set(TECHNOMAGE_SPELLS.map((spell) => spell.id)).size).toBe(289);
    for (const school of TECHNOMAGE_SCHOOLS) {
      expect(
        TECHNOMAGE_SPELLS.some((spell) => spell.school === school.id),
      ).toBe(true);
    }
  });

  it("recognizes the Technomage role spelling", () => {
    expect(isTechnomageRole("Technomage")).toBe(true);
    expect(isTechnomageRole("Techno-Mage")).toBe(true);
    expect(isTechnomageRole("Mediziner")).toBe(false);
  });

  it("normalizes experience tiers to the spell-slot budget", () => {
    expect(technomageSpellSlotTotal("novice")).toBe(5);
    expect(technomageSpellSlotTotal("experienced")).toBe(15);
    expect(technomageSpellSlotTotal("veteran")).toBe(30);
    expect(technomageSpellSlotTotal(null)).toBe(5);
  });

  it("translates targets and keeps school-specific round durations", () => {
    const armour = getTechnomageSpell("armour-lesser");
    const blurryImage = getTechnomageSpell("blurry-image");
    expect(armour).toBeDefined();
    expect(blurryImage).toBeDefined();
    if (!armour || !blurryImage) return;

    expect(technomageSpellExplanation(armour, "defence", schools)).toContain(
      "Ziel: eine Kreatur.",
    );
    expect(
      technomageSpellExplanation(blurryImage, "defence", schools),
    ).toContain("8 Kampfrunden");
    expect(
      technomageSpellExplanation(blurryImage, "elements", [
        "defence",
        ...schools.slice(0, 2),
      ]),
    ).toContain("3 Kampfrunden");
  });

  it("auto-learns local and foreign-school prerequisites", () => {
    const plan = createSpellPurchasePlan({
      spellId: "skin-of-wood",
      knownSpellIds: [],
      slotTotal: 10,
      primarySchool: "defence",
      weakSchools: [...schools],
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.spellIds).toEqual(
      expect.arrayContaining([
        "skin-of-wood",
        "elemental-resistance-lesser",
        "armour-lesser",
        "create-acid",
      ]),
    );
    expect(plan.spellIds.at(-1)).toBe("skin-of-wood");
    expect(spellPrerequisiteGroups("elemental-resistance-lesser")).toHaveLength(
      1,
    );
    expect(
      spellPrerequisiteGroups("elemental-resistance-lesser")[0],
    ).toContain("create-fire");
  });

  it("rejects a purchase when the full prerequisite chain exceeds available slots", () => {
    const plan = createSpellPurchasePlan({
      spellId: "skin-of-wood",
      knownSpellIds: [],
      slotTotal: 3,
      primarySchool: "defence",
      weakSchools: [...schools],
    });

    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error).toContain("Spellplatz");
  });

  it("enforces primary-school prerequisites", () => {
    const plan = createSpellPurchasePlan({
      spellId: "healing-total",
      knownSpellIds: [],
      slotTotal: 30,
      primarySchool: "defence",
      weakSchools: [...schools],
    });

    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error).toContain("Primärschule");
  });
});
