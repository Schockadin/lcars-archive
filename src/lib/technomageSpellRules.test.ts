import { describe, expect, it } from "vitest";
import {
  TECHNOMAGE_SCHOOLS,
  TECHNOMAGE_SPELLS,
  getTechnomageSpell,
  isTechnomageRole,
  spellPrerequisiteGroups,
  technomageSpellExplanation,
} from "@/lib/technomageSpellCatalog";
import {
  snapshotTechnomageApSlotReasons,
  technomageSpellSlotTotal,
} from "@/lib/technomageSpellSlots";
import {
  createSpellPurchasePlan,
  getSpellPurchaseSlotCost,
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

  it("rounds each spell-slot milestone up and keeps its saved Reason value", () => {
    const progress = {
      creationReason: 7,
      organellesReason: 8,
      ftlAttunementReason: null,
      apMilestones: [7],
    };
    expect(technomageSpellSlotTotal(progress, 12, 20)).toBe(15);
    expect(technomageSpellSlotTotal(progress, 8, 40)).toBe(19);
    const beforeReasonChange = technomageSpellSlotTotal(
      { ...progress, apMilestones: [] },
      8,
      40,
    );
    const savedMilestones = snapshotTechnomageApSlotReasons(
      { ...progress, apMilestones: [] },
      40,
      8,
    );
    expect(savedMilestones.apMilestones).toEqual([8, 8]);
    expect(technomageSpellSlotTotal(savedMilestones, 12, 40)).toBe(
      beforeReasonChange,
    );
    expect(
      technomageSpellSlotTotal(
        { ...progress, creationReason: null, organellesReason: null, apMilestones: [] },
        7,
      ),
    ).toBe(8);
  });

  it("uses GM-configured bonuses, Reason modifiers, and AP thresholds", () => {
    const rules = {
      creationBaseSlots: 5,
      creationBonusSlots: 2.5,
      reasonBaseline: 7,
      reasonModifier: 2,
      organellesBonusSlots: 2.5,
      ftlAttunementBonusSlots: 2.5,
      apThreshold: 10,
      apBonusSlots: 2.5,
    };
    const savedMilestones = snapshotTechnomageApSlotReasons(
      {
        creationReason: 7,
        organellesReason: null,
        ftlAttunementReason: null,
        apMilestones: [],
      },
      20,
      8,
      rules.apThreshold,
    );

    expect(savedMilestones.apMilestones).toEqual([8, 8]);
    expect(
      technomageSpellSlotTotal(savedMilestones, 12, 20, rules),
    ).toBe(18);
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

  it("keeps mandatory prerequisites alongside alternative prerequisite groups", () => {
    const groups = spellPrerequisiteGroups("elemental-resistance-lesser");
    expect(groups).toEqual([
      ["armour-lesser"],
      [
        "create-acid",
        "create-fire",
        "create-ice",
        "create-lightning",
        "create-sound",
      ],
    ]);

    const plan = createSpellPurchasePlan({
      spellId: "elemental-resistance-lesser",
      knownSpellIds: [],
      slotTotal: 20,
      primarySchool: "defence",
      weakSchools: [...schools],
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.spellIds).toContain("armour-lesser");
    expect(plan.spellIds).toContain("elemental-resistance-lesser");
    expect(plan.spellIds.some((id) =>
      ["create-acid", "create-fire", "create-ice", "create-lightning", "create-sound"].includes(id)
    )).toBe(true);
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

  it("reports the purchase cost including prerequisites and its slot threshold", () => {
    const input = {
      spellId: "skin-of-wood",
      knownSpellIds: [],
      primarySchool: "defence" as const,
      weakSchools: [...schools],
    };
    const cost = getSpellPurchaseSlotCost(input);

    expect(cost).not.toBeNull();
    if (cost === null) return;

    const exactlyAffordable = createSpellPurchasePlan({
      ...input,
      slotTotal: cost,
    });
    const oneShort = createSpellPurchasePlan({
      ...input,
      slotTotal: cost - 1,
    });

    expect(exactlyAffordable.ok).toBe(true);
    expect(oneShort.ok).toBe(false);
    expect(cost).toBeGreaterThan(1);
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
