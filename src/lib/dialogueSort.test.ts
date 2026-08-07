import { describe, it, expect } from "vitest";
import { parseDialogueLogDate, byDialogueLogDateDesc } from "./dialogueSort";

describe("parseDialogueLogDate", () => {
  it("liest logDate aus einem Objekt (jsonb)", () => {
    expect(parseDialogueLogDate({ logDate: "2401-05-12" })).toBe("2401-05-12");
  });

  it("liest logDate aus einem JSON-String", () => {
    expect(parseDialogueLogDate('{"logDate":"2400-01-01"}')).toBe("2400-01-01");
  });

  it("liefert null bei fehlendem/leerem/ungültigem Wert", () => {
    expect(parseDialogueLogDate({ logDate: null })).toBeNull();
    expect(parseDialogueLogDate({ logDate: "  " })).toBeNull();
    expect(parseDialogueLogDate({})).toBeNull();
    expect(parseDialogueLogDate(null)).toBeNull();
    expect(parseDialogueLogDate("nicht-json")).toBeNull();
  });
});

describe("byDialogueLogDateDesc", () => {
  function sorted(items: { logDate: string | null; updatedAt: string }[]) {
    return [...items].sort(byDialogueLogDateDesc).map((i) => i.logDate);
  }

  it("sortiert nach logDate absteigend (neueste zuerst)", () => {
    expect(
      sorted([
        { logDate: "2400-01-01", updatedAt: "x" },
        { logDate: "2402-06-01", updatedAt: "x" },
        { logDate: "2401-03-15", updatedAt: "x" },
      ]),
    ).toEqual(["2402-06-01", "2401-03-15", "2400-01-01"]);
  });

  it("schiebt Gespräche ohne logDate ans Ende", () => {
    expect(
      sorted([
        { logDate: null, updatedAt: "x" },
        { logDate: "2401-01-01", updatedAt: "x" },
        { logDate: null, updatedAt: "y" },
        { logDate: "2405-01-01", updatedAt: "x" },
      ]),
    ).toEqual(["2405-01-01", "2401-01-01", null, null]);
  });

  it("nutzt updatedAt (jüngste zuerst) als Tiebreaker bei gleichem/fehlendem Datum", () => {
    const result = [
      { logDate: null, updatedAt: "2026-01-01T00:00:00Z" },
      { logDate: null, updatedAt: "2026-06-01T00:00:00Z" },
    ].sort(byDialogueLogDateDesc);
    expect(result[0].updatedAt).toBe("2026-06-01T00:00:00Z");
  });
});
