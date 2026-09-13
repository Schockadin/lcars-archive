import { describe, it, expect } from "vitest";
import { parseCharacterStats } from "@/lib/characterStats";
import {
  parseAdvancementNote,
  revertAdvancements,
  reapplyAdvancements,
} from "@/lib/creationReset";
import { DEFAULT_ADVANCEMENT_RULES } from "@/lib/advancement";

// Ein festgeschriebener Bogen, auf dem nach der Erschaffung gesteigert wurde:
// Kontrolle 9 → 10, Technik 2 → 3 und ein gekauftes Talent.
const lockedStats = parseCharacterStats({
  creationLocked: true,
  attributes: {
    control: 10,
    daring: 9,
    fitness: 9,
    insight: 9,
    presence: 9,
    reason: 9,
  },
  departments: {
    command: 2,
    conn: 2,
    engineering: 3,
    security: 2,
    medicine: 2,
    science: 2,
  },
  talents: ["Bold: Command", "Testing a Theory"],
  focuses: ["Astrophysics"],
});

// Das Journal, neueste Buchung zuerst — genau so liefert getApAccount es. Die
// Klartexte stehen dort so, wie checkAdvancement sie schreibt: mit dem Begriff
// des Originalbogens („Control", „Engineering").
const bookings = [
  { amount: -20, note: "Testing a Theory", createdAt: "2399-03-03" },
  { amount: -30, note: "Engineering 2 → 3", createdAt: "2399-02-02" },
  { amount: -30, note: "Control 9 → 10", createdAt: "2399-01-01" },
];

describe("parseAdvancementNote", () => {
  it("erkennt ein Attribut am Klartext der Buchung", () => {
    expect(parseAdvancementNote("Control 9 → 10", lockedStats)).toEqual({
      kind: "attribute",
      key: "control",
      entry: null,
      previousValue: 9,
    });
  });

  // Gebucht wird der englische Begriff; eine deutsch beschriftete Buchung aus
  // einem älteren Stand soll trotzdem zugeordnet werden.
  it("erkennt eine Disziplin auch unter ihrem deutschen Namen", () => {
    expect(parseAdvancementNote("Technik 2 → 3", lockedStats)).toEqual({
      kind: "department",
      key: "engineering",
      entry: null,
      previousValue: 2,
    });
  });

  it("unterscheidet Talent und Schwerpunkt über den Bogen", () => {
    expect(parseAdvancementNote("Testing a Theory", lockedStats)?.kind).toBe(
      "talent",
    );
    expect(parseAdvancementNote("Astrophysics", lockedStats)?.kind).toBe(
      "focus",
    );
  });

  it("liefert null, wenn sich die Buchung keinem Ziel zuordnen lässt", () => {
    expect(parseAdvancementNote("Irgendwas", lockedStats)).toBeNull();
    expect(parseAdvancementNote(null, lockedStats)).toBeNull();
  });
});

describe("revertAdvancements", () => {
  const result = revertAdvancements(lockedStats, bookings);

  it("setzt die Werte auf den Stand der Erschaffung zurück", () => {
    expect(result.stats.attributes.control).toBe(9);
    expect(result.stats.departments.engineering).toBe(2);
    expect(result.stats.talents).toEqual(["Bold: Command"]);
    expect(result.stats.focuses).toEqual(["Astrophysics"]);
  });

  it("öffnet die Erschaffung wieder", () => {
    expect(result.stats.creationLocked).toBe(false);
  });

  it("notiert die Rücknahmen chronologisch, ältestes zuerst", () => {
    expect(result.stats.pendingAdvancements.map((e) => e.label)).toEqual([
      "Control 9 → 10",
      "Engineering 2 → 3",
      "Testing a Theory",
    ]);
    expect(result.stats.pendingAdvancements[0]).toMatchObject({
      kind: "attribute",
      key: "control",
      cost: 30,
    });
    expect(result.stats.pendingAdvancements[2]).toMatchObject({
      kind: "talent",
      entry: "Testing a Theory",
      cost: 20,
    });
  });

  it("gibt für jede Rücknahme die gutzuschreibenden AP zurück", () => {
    expect(result.refunds.reduce((sum, r) => sum + r.cost, 0)).toBe(80);
  });

  it("nimmt mehrere Schritte desselben Werts bis zum Ausgangswert zurück", () => {
    const twice = revertAdvancements(lockedStats, [
      { amount: -30, note: "Control 9 → 10", createdAt: "2399-02-01" },
      { amount: -20, note: "Control 8 → 9", createdAt: "2399-01-01" },
    ]);
    expect(twice.stats.attributes.control).toBe(8);
    expect(twice.stats.pendingAdvancements).toHaveLength(2);
  });

  it("lässt unzuordenbare Buchungen unangetastet stehen", () => {
    const odd = revertAdvancements(lockedStats, [
      { amount: -5, note: "Handbuchung der Spielleitung", createdAt: "2399-01-01" },
    ]);
    expect(odd.unresolved).toEqual(["Handbuchung der Spielleitung"]);
    expect(odd.refunds).toHaveLength(0);
    expect(odd.stats.pendingAdvancements).toHaveLength(0);
  });
});

describe("reapplyAdvancements", () => {
  const reverted = revertAdvancements(lockedStats, bookings).stats;

  it("stellt bei ausreichenden AP den ursprünglichen Stand wieder her", () => {
    const result = reapplyAdvancements(
      { ...reverted, creationLocked: true },
      reverted.pendingAdvancements,
      80,
      DEFAULT_ADVANCEMENT_RULES,
    );

    expect(result.skipped).toHaveLength(0);
    expect(result.stats.attributes.control).toBe(10);
    expect(result.stats.departments.engineering).toBe(3);
    expect(result.stats.talents).toContain("Testing a Theory");
    expect(result.applied.reduce((sum, a) => sum + a.cost, 0)).toBe(80);
    expect(result.stats.pendingAdvancements).toHaveLength(0);
  });

  it("überspringt, was die AP nicht mehr hergeben, und nennt den Grund", () => {
    const result = reapplyAdvancements(
      { ...reverted, creationLocked: true },
      reverted.pendingAdvancements,
      30,
      DEFAULT_ADVANCEMENT_RULES,
    );

    expect(result.applied.map((a) => a.label)).toEqual(["Control 9 → 10"]);
    expect(result.skipped.map((s) => s.label)).toEqual([
      "Engineering 2 → 3",
      "Testing a Theory",
    ]);
    expect(result.skipped[0].error).toMatch(/AP/);
    // Auch die übersprungenen verschwinden aus der Notiz: die Erschaffung ist
    // abgeschlossen, sie kommen nicht von selbst wieder.
    expect(result.stats.pendingAdvancements).toHaveLength(0);
  });

  it("rechnet mit den heute geltenden Regeln, nicht mit den damaligen Kosten", () => {
    const result = reapplyAdvancements(
      { ...reverted, creationLocked: true },
      reverted.pendingAdvancements.slice(0, 1),
      999,
      { ...DEFAULT_ADVANCEMENT_RULES, apPerStep: 20 },
    );
    // Kontrolle auf 10: (10 − 7) × 20 AP statt der damals gebuchten 30.
    expect(result.applied).toEqual([{ label: "Control 9 → 10", cost: 60 }]);
  });
});
