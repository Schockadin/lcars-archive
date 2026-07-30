import { describe, it, expect } from "vitest";
import {
  isIndexProtected,
  isRangeProtected,
  type ProtectedRange,
} from "./protectedRanges";

// Referenz-Implementierung (die frühere protectedRanges.some(…)-Logik) —
// gegen sie prüfen wir die Binärsuche über viele Fälle gegen.
function refIndex(ranges: ProtectedRange[], i: number): boolean {
  return ranges.some(([s, e]) => i >= s && i < e);
}
function refRange(ranges: ProtectedRange[], start: number, end: number): boolean {
  return ranges.some(([s, e]) => start < e && end > s);
}

const RANGES: ProtectedRange[] = [
  [2, 5],
  [8, 8], // leerer Bereich (kommt bei Null-Längen-Matches theoretisch vor)
  [10, 14],
  [20, 21],
];

describe("isIndexProtected", () => {
  it("stimmt für jeden Index mit der linearen Referenz überein", () => {
    for (let i = -1; i <= 25; i++) {
      expect(isIndexProtected(RANGES, i)).toBe(refIndex(RANGES, i));
    }
  });

  it("erkennt Ränder korrekt (start inklusive, end exklusiv)", () => {
    expect(isIndexProtected(RANGES, 2)).toBe(true);
    expect(isIndexProtected(RANGES, 4)).toBe(true);
    expect(isIndexProtected(RANGES, 5)).toBe(false);
    expect(isIndexProtected(RANGES, 1)).toBe(false);
  });

  it("liefert für leere Bereichsliste immer false", () => {
    expect(isIndexProtected([], 3)).toBe(false);
  });
});

describe("isRangeProtected", () => {
  it("stimmt für alle nicht-leeren Teilbereiche mit der linearen Referenz überein", () => {
    // Nur nicht-leere Query-Bereiche (b > a) — genau das, was die realen
    // Aufrufer übergeben (Match-Längen ≥ 1). Leere Bereiche (b === a) haben
    // bewusst eine eigene Semantik (false), separat getestet.
    for (let a = -1; a <= 24; a++) {
      for (let b = a + 1; b <= 25; b++) {
        expect(isRangeProtected(RANGES, a, b)).toBe(refRange(RANGES, a, b));
      }
    }
  });

  it("behandelt einen leeren Bereich als nicht geschützt", () => {
    expect(isRangeProtected(RANGES, 3, 3)).toBe(false);
  });

  it("erkennt eine Überlappung, die mehrere Bereiche umspannt", () => {
    expect(isRangeProtected(RANGES, 4, 11)).toBe(true);
  });

  it("erkennt eine Lücke zwischen zwei Bereichen", () => {
    expect(isRangeProtected(RANGES, 5, 8)).toBe(false);
  });
});
