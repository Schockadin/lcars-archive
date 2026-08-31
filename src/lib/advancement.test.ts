import { describe, it, expect } from "vitest";
import {
  attributeStepCost,
  departmentStepCost,
  creationAttributeCost,
  creationDepartmentCost,
  creationBudget,
  checkAdvancement,
  applyAdvancement,
  CREATION_ATTRIBUTE_BUDGET,
  CREATION_DEPARTMENT_BUDGET,
  TALENT_COST,
  FOCUS_COST,
} from "./advancement";
import { parseCharacterStats, ATTRIBUTE_FIELDS, DEPARTMENT_FIELDS } from "./characterStats";
import type { CharacterStats } from "@/types/characterStats";

function statsWith(
  attributes: number[],
  departments: number[] = [],
): CharacterStats {
  return parseCharacterStats({
    attributes: Object.fromEntries(
      ATTRIBUTE_FIELDS.map((f, i) => [f.key, attributes[i]]),
    ),
    departments: Object.fromEntries(
      DEPARTMENT_FIELDS.map((f, i) => [f.key, departments[i]]),
    ),
  });
}

describe("Steigerungskosten", () => {
  it("rechnet Attribute mit (neuer Wert − 7) × 10", () => {
    expect(attributeStepCost(8)).toBe(10);
    expect(attributeStepCost(10)).toBe(30);
    expect(attributeStepCost(12)).toBe(50);
  });

  it("rechnet Disziplinen mit (neuer Wert) × 10", () => {
    expect(departmentStepCost(2)).toBe(20);
    expect(departmentStepCost(5)).toBe(50);
  });
});

describe("Erschaffungsbudget", () => {
  it("summiert die Einzelschritte bis zum gewählten Wert", () => {
    // Ein Attribut von 7 auf 12: 10+20+30+40+50 = 150 AP.
    expect(creationAttributeCost(statsWith([12, 7, 7, 7, 7, 7]))).toBe(150);
    // Eine Disziplin von 1 auf 5: 20+30+40+50 = 140 AP.
    expect(creationDepartmentCost(statsWith([], [5, 1, 1, 1, 1, 1]))).toBe(140);
  });

  it("zählt ungepflegte Werte als 0 AP", () => {
    expect(creationAttributeCost(parseCharacterStats({}))).toBe(0);
    expect(creationDepartmentCost(parseCharacterStats({}))).toBe(0);
  });

  // Gegenprobe zur Regelvorgabe: 320 AP sollen die bisherigen 56 Attributs-
  // bzw. 16 Disziplin-Verteilpunkte ersetzen. Eine übliche Verteilung muss
  // also knapp hineinpassen ("vielleicht habt ihr noch den ein- oder anderen
  // Punkt frei").
  it("lässt eine übliche 56er-Attributsverteilung ins Budget passen", () => {
    // 12,10,10,9,8,7 = 56 Punkte
    const budget = creationBudget(statsWith([12, 10, 10, 9, 8, 7]));
    expect(budget.attributeCost).toBe(310);
    expect(budget.attributeRemaining).toBe(10);
    expect(budget.overBudget).toBe(false);
  });

  it("lässt eine übliche 16er-Disziplinverteilung ins Budget passen", () => {
    // 5,4,3,2,1,1 = 16 Punkte
    const budget = creationBudget(statsWith([], [5, 4, 3, 2, 1, 1]));
    expect(budget.departmentCost).toBe(300);
    expect(budget.departmentRemaining).toBe(20);
  });

  it("meldet eine Überziehung", () => {
    // 12,11,11,10,9,8 kostet 450 AP und sprengt die 320.
    const budget = creationBudget(statsWith([12, 11, 11, 10, 9, 8]));
    expect(budget.attributeCost).toBeGreaterThan(CREATION_ATTRIBUTE_BUDGET);
    expect(budget.attributeRemaining).toBeLessThan(0);
    expect(budget.overBudget).toBe(true);
  });

  it("hält die Budgets für beide Gruppen getrennt", () => {
    const budget = creationBudget(statsWith([12, 7, 7, 7, 7, 7], [5, 1, 1, 1, 1, 1]));
    expect(budget.attributeCost).toBe(150);
    expect(budget.departmentCost).toBe(140);
    expect(CREATION_DEPARTMENT_BUDGET).toBe(320);
  });
});

describe("checkAdvancement", () => {
  it("berechnet Kosten und neuen Wert einer Attributssteigerung", () => {
    const result = checkAdvancement(
      statsWith([9, 8, 8, 8, 8, 7]),
      { kind: "attribute", key: "control" },
      100,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.newValue).toBe(10);
    expect(result.plan.cost).toBe(30);
  });

  it("berechnet Kosten einer Disziplinsteigerung", () => {
    const result = checkAdvancement(
      statsWith([], [3, 2, 1, 1, 1, 1]),
      { kind: "department", key: "command" },
      100,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.newValue).toBe(4);
    expect(result.plan.cost).toBe(40);
  });

  it("verweigert eine Steigerung ohne AP-Deckung", () => {
    const result = checkAdvancement(
      statsWith([9, 8, 8, 8, 8, 7]),
      { kind: "attribute", key: "control" },
      20,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("30 AP nötig");
  });

  it("verweigert das Überschreiten des Höchstwerts", () => {
    const result = checkAdvancement(
      statsWith([12, 8, 8, 8, 8, 7]),
      { kind: "attribute", key: "control" },
      999,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Höchstwert 12");
  });

  it("hält die Häufungsgrenzen ein (nur ein 12er, zwei 11er)", () => {
    // Ein 12er existiert bereits — ein zweiter darf nicht entstehen.
    const zweiterZwoelfer = checkAdvancement(
      statsWith([12, 11, 8, 8, 8, 7]),
      { kind: "attribute", key: "daring" },
      999,
    );
    expect(zweiterZwoelfer.ok).toBe(false);
    if (!zweiterZwoelfer.ok) {
      expect(zweiterZwoelfer.error).toContain("Nur 1× 12");
    }

    // Zwei 11er existieren bereits — der 10er darf nicht der dritte werden.
    // (Reihenfolge der Werte: control, daring, fitness, insight, presence, reason)
    const dritterElfer = checkAdvancement(
      statsWith([11, 11, 10, 8, 8, 7]),
      { kind: "attribute", key: "fitness" },
      999,
    );
    expect(dritterElfer.ok).toBe(false);
    if (!dritterElfer.ok) {
      expect(dritterElfer.error).toContain("Nur 2× 11");
    }
  });

  it("hält dieselben Grenzen bei Disziplinen ein", () => {
    const zweiteFuenf = checkAdvancement(
      statsWith([], [5, 4, 1, 1, 1, 1]),
      { kind: "department", key: "conn" },
      999,
    );
    expect(zweiteFuenf.ok).toBe(false);
    if (!zweiteFuenf.ok) expect(zweiteFuenf.error).toContain("Nur 1× 5");
  });

  it("verlangt für ungepflegte Werte erst einen Startwert", () => {
    const result = checkAdvancement(
      parseCharacterStats({}),
      { kind: "attribute", key: "control" },
      999,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("noch nicht gepflegt");
  });

  it("kostet Talente und Schwerpunkte je 20 AP", () => {
    const stats = parseCharacterStats({ talents: ["Resolut"] });
    const talent = checkAdvancement(
      stats,
      { kind: "talent", entry: "Bold: Command" },
      20,
    );
    expect(talent.ok).toBe(true);
    if (talent.ok) expect(talent.plan.cost).toBe(TALENT_COST);

    const focus = checkAdvancement(stats, { kind: "focus", entry: "Warp" }, 20);
    expect(focus.ok).toBe(true);
    if (focus.ok) expect(focus.plan.cost).toBe(FOCUS_COST);
  });

  it("verweigert doppelte Talente/Schwerpunkte und leere Eingaben", () => {
    const stats = parseCharacterStats({ talents: ["Resolut"] });
    const doppelt = checkAdvancement(
      stats,
      { kind: "talent", entry: "  resolut " },
      999,
    );
    expect(doppelt.ok).toBe(false);

    const leer = checkAdvancement(stats, { kind: "talent", entry: "   " }, 999);
    expect(leer.ok).toBe(false);
  });
});

describe("applyAdvancement", () => {
  it("erhöht den gesteigerten Wert und lässt die übrigen unberührt", () => {
    const stats = statsWith([9, 8, 8, 8, 8, 7]);
    const check = checkAdvancement(
      stats,
      { kind: "attribute", key: "control" },
      999,
    );
    expect(check.ok).toBe(true);
    if (!check.ok) return;

    const next = applyAdvancement(stats, { kind: "attribute", key: "control" }, check.plan);
    expect(next.attributes.control).toBe(10);
    expect(next.attributes.daring).toBe(8);
    // Die Ausgangsdaten bleiben unangetastet.
    expect(stats.attributes.control).toBe(9);
  });

  it("hängt Talente und Schwerpunkte an", () => {
    const stats = parseCharacterStats({ focuses: ["Warp"] });
    const check = checkAdvancement(stats, { kind: "focus", entry: "Sensoren" }, 20);
    expect(check.ok).toBe(true);
    if (!check.ok) return;

    const next = applyAdvancement(stats, { kind: "focus", entry: "Sensoren" }, check.plan);
    expect(next.focuses).toEqual(["Warp", "Sensoren"]);
  });
});
