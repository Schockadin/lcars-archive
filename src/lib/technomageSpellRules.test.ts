import { describe, expect, it } from "vitest";
import {
  TECHNOMAGE_SCHOOLS,
  TECHNOMAGE_SPELLS,
  getTechnomageSpell,
  isTechnomageRole,
  spellPrerequisiteGroups,
  technomageSpellDetails,
  technomageSpellExplanation,
} from "@/lib/technomageSpellCatalog";
import {
  calculateTechnomagePowerPointRecovery,
  createSpellPurchasePlan,
  effectiveTechnomagePowerPoints,
  technomageAbilityModifier,
  technomageApForLevel,
  technomageKnownSpellLimit,
  technomageLevelFromAp,
  technomagePowerPointMaximum,
  technomageRecoveryIntervalMinutes,
} from "@/lib/technomageSpellRules";

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

  it("maps total awarded AP to nonlinear d20 levels", () => {
    expect(technomageLevelFromAp(0)).toBe(1);
    expect(technomageLevelFromAp(6)).toBe(1);
    expect(technomageLevelFromAp(7)).toBe(2);
    expect(technomageLevelFromAp(20)).toBe(3);
    expect(technomageLevelFromAp(40)).toBe(4);
    expect(technomageLevelFromAp(67)).toBe(5);
    expect(technomageLevelFromAp(5_000)).toBe(20);
    expect(technomageApForLevel(4)).toBe(40);
    expect(technomageApForLevel(21)).toBeNull();
  });

  it("uses STA 2e attribute modifiers as the attribute value minus 7", () => {
    expect(technomageAbilityModifier(11)).toBe(4);
    expect(technomageAbilityModifier(9)).toBe(2);
    expect(technomageAbilityModifier(10)).toBe(3);
    expect(technomageAbilityModifier(null)).toBe(0);
  });

  it("calculates known-spell capacity from the Fact Book class table", () => {
    expect(technomageKnownSpellLimit(1, 10)).toBe(11);
    expect(technomageKnownSpellLimit(4, 10)).toBe(27);
    expect(technomageKnownSpellLimit(4, 12)).toBe(35);
    expect(technomageKnownSpellLimit(7, 7)).toBe(20);
  });

  it("calculates maximum Power Points from class level and STA 2e attributes", () => {
    expect(technomagePowerPointMaximum(1, 10, 10)).toBe(20);
    expect(technomagePowerPointMaximum(4, 10, 10)).toBe(36);
    expect(technomagePowerPointMaximum(5, 10, 10)).toBe(45);
    expect(technomagePowerPointMaximum(4, 12, 12)).toBe(46);
  });

  it("uses STA 2e attributes for a Technomage with 40 awarded AP", () => {
    const level = technomageLevelFromAp(40);
    expect(level).toBe(4);
    expect(technomageKnownSpellLimit(level, 11)).toBe(31);
    expect(technomagePowerPointMaximum(level, 9, 10)).toBe(35);
  });

  it("carries new PP capacity forward and follows Fact Book recovery intervals", () => {
    expect(effectiveTechnomagePowerPoints(10, 21, 26)).toBe(15);
    expect(effectiveTechnomagePowerPoints(10, 21, 18)).toBe(7);
    expect(effectiveTechnomagePowerPoints(null, null, 21)).toBe(21);
    expect(technomageRecoveryIntervalMinutes("meditation", 0)).toBe(10);
    expect(technomageRecoveryIntervalMinutes("meditation", 1)).toBe(20);
    expect(technomageRecoveryIntervalMinutes("light", 2)).toBe(90);
    expect(technomageRecoveryIntervalMinutes("strenuous", 2)).toBe(180);
  });

  it("preserves partial PP recovery progress across recovery sessions", () => {
    const partial = calculateTechnomagePowerPointRecovery({
      current: 10,
      maximum: 21,
      durationMinutes: 5,
      activity: "meditation",
      maintainedSpellCount: 0,
      progress: 0,
    });
    expect(partial).toEqual({ current: 10, recovered: 0, progress: 0.5 });

    const completed = calculateTechnomagePowerPointRecovery({
      current: partial.current,
      maximum: 21,
      durationMinutes: 15,
      activity: "light",
      maintainedSpellCount: 0,
      progress: partial.progress,
    });
    expect(completed).toEqual({ current: 11, recovered: 1, progress: 0 });
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

  it("formats spell details in rules-first order and omits absent optional fields", () => {
    const armour = getTechnomageSpell("armour-lesser");
    const blurryImage = getTechnomageSpell("blurry-image");
    expect(armour).toBeDefined();
    expect(blurryImage).toBeDefined();
    if (!armour || !blurryImage) return;

    const basic = technomageSpellDetails(armour, "defence", schools);
    expect(basic.fields.map(({ label }) => label)).toEqual([
      "Casting Time",
      "Range",
      "Target",
      "Duration",
      "Casting Cost",
      "Difficulty",
    ]);
    expect(basic.range).toBe("Berührung");
    expect(basic.target).toBe("eine Kreatur");
    expect(basic.castingTime).toBe("nicht im Katalog erfasst");
    expect(basic.castingCost).toBe("nicht im Katalog erfasst");
    expect(basic.mechanics).toContain("Bei Erfolg erhält das Ziel");
    expect(basic.fluff).toBeTruthy();

    const detailed = technomageSpellDetails(
      {
        ...blurryImage,
        sourceCastingTime: "1 standard action",
        sourceCastingCost: "2 PP",
        sourceMaintenanceCost: "1 PP per round",
      },
      "defence",
      schools,
    );
    expect(detailed.fields.map(({ label }) => label)).toEqual([
      "Requirements",
      "Casting Time",
      "Range",
      "Target",
      "Duration",
      "Casting Cost",
      "Maintenance Cost",
      "Difficulty",
    ]);
    expect(detailed.fields[0].value).toBe("Personal Shield");
    expect(detailed.fields[6].value).toBe("1 PP per round");
  });

  it("auto-learns local and foreign-school prerequisites", () => {
    const plan = createSpellPurchasePlan({
      spellId: "skin-of-wood",
      knownSpellIds: [],
      knownSpellLimit: 10,
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
    const resistanceRequirements = spellPrerequisiteGroups(
      "elemental-resistance-lesser",
    );
    expect(resistanceRequirements).toHaveLength(2);
    expect(resistanceRequirements[0]).toEqual(["armour-lesser"]);
    expect(resistanceRequirements[1]).toContain("create-fire");
  });

  it("rejects a purchase when the prerequisite chain exceeds known-spell capacity", () => {
    const plan = createSpellPurchasePlan({
      spellId: "skin-of-wood",
      knownSpellIds: [],
      knownSpellLimit: 3,
      primarySchool: "defence",
      weakSchools: [...schools],
    });

    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error).toContain("Kapazität");
  });

  it("enforces primary-school prerequisites", () => {
    const plan = createSpellPurchasePlan({
      spellId: "healing-total",
      knownSpellIds: [],
      knownSpellLimit: 30,
      primarySchool: "defence",
      weakSchools: [...schools],
    });

    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error).toContain("Primärschule");
  });
});
