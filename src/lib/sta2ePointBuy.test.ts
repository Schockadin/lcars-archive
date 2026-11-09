import { describe, expect, it } from "vitest";
import { EMPTY_CHARACTER_STATS, parseCharacterStats } from "@/lib/characterStats";
import { checkSta2ePointBuy, sta2ePointBuyTotals } from "@/lib/sta2ePointBuy";

function pointBuyStats() {
  return {
    ...EMPTY_CHARACTER_STATS,
    creationMethod: "sta2e-point-buy" as const,
    attributes: {
      control: 12,
      daring: 10,
      fitness: 10,
      insight: 9,
      presence: 8,
      reason: 7,
    },
    departments: {
      command: 5,
      conn: 4,
      engineering: 3,
      security: 2,
      medicine: 1,
      science: 1,
    },
  };
}

describe("STA 2e point-buy creation", () => {
  it("recognizes a complete 56/16 distribution", () => {
    const stats = pointBuyStats();

    expect(sta2ePointBuyTotals(stats)).toEqual({ attributes: 56, departments: 16 });
    expect(checkSta2ePointBuy(stats)).toEqual([]);
  });

  it("requires the exact attribute and department totals", () => {
    const stats = pointBuyStats();
    stats.attributes.control = 11;
    stats.departments.command = 4;

    expect(checkSta2ePointBuy(stats)).toEqual([
      "Die Attributsumme muss 56 betragen (aktuell 55).",
      "Die Disziplinensumme muss 16 betragen (aktuell 15).",
    ]);
  });

  it("requires every rating and keeps point-buy limits separate from AP mode", () => {
    const incomplete = {
      ...pointBuyStats(),
      attributes: { ...pointBuyStats().attributes, reason: null },
    };

    expect(checkSta2ePointBuy(incomplete)).toEqual([
      "Das STA-2e-Punktesystem benötigt sechs Attribute und sechs Disziplinen.",
    ]);
    expect(checkSta2ePointBuy(EMPTY_CHARACTER_STATS)).toEqual([]);
  });

  it("preserves the point-buy method when stats are loaded from storage", () => {
    expect(parseCharacterStats({ creationMethod: "sta2e-point-buy" }).creationMethod)
      .toBe("sta2e-point-buy");
    expect(parseCharacterStats({}).creationMethod).toBe("ap");
  });
});
