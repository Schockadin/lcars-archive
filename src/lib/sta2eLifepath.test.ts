import { describe, expect, it } from "vitest";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import {
  applySta2eLifepath,
  checkSta2eLifepath,
  EMPTY_STA2E_LIFEPATH,
} from "@/lib/sta2eLifepath";

describe("STA 2e Lifepath", () => {
  it("leaves AP-budget creation outside Lifepath validation", () => {
    expect(checkSta2eLifepath(EMPTY_CHARACTER_STATS, [])).toEqual([]);
    expect(applySta2eLifepath(EMPTY_CHARACTER_STATS)).toBe(EMPTY_CHARACTER_STATS);
  });

  it("reports a missing Lifepath record for Lifepath-created characters", () => {
    const stats = {
      ...EMPTY_CHARACTER_STATS,
      creationMethod: "sta2e-lifepath" as const,
    };

    expect(checkSta2eLifepath(stats, ["Human"])).toEqual([
      "Der Lifepath ist nicht vollständig gespeichert.",
    ]);
  });

  it("rebuilds sheet ratings and origin fields from recorded choices", () => {
    const lifepath = structuredClone(EMPTY_STA2E_LIFEPATH);
    lifepath.speciesAttributes = ["control", "fitness", "reason"];
    lifepath.environment = {
      ...lifepath.environment,
      choice: "homeworld",
      attribute: "control",
      department: "science",
      value: "Curiosity guides me",
    };
    const stats = {
      ...EMPTY_CHARACTER_STATS,
      creationMethod: "sta2e-lifepath" as const,
      lifepath,
    };

    const rebuilt = applySta2eLifepath(stats, ["Human"]);

    expect(rebuilt.attributes).toMatchObject({ control: 9, fitness: 8, reason: 8 });
    expect(rebuilt.departments.science).toBe(2);
    expect(rebuilt.environment).toBe("Homeworld");
    expect(rebuilt.traits).toBe("Human");
    expect(rebuilt.values).toEqual(["Curiosity guides me"]);
  });
});
