import { describe, it, expect } from "vitest";
import {
  parseHexColor,
  toHexColor,
  relativeLuminance,
  contrastRatio,
  contrastLevel,
  mixWithBlack,
  formatContrast,
  LIGHT_ACCENT_INK_MIX,
  CONTRAST_THRESHOLDS,
} from "./contrast";

describe("parseHexColor / toHexColor", () => {
  it("liest lange Hex-Werte", () => {
    expect(parseHexColor("#ff9a00")).toEqual({ r: 255, g: 154, b: 0 });
    expect(parseHexColor("  #FF9A00 ")).toEqual({ r: 255, g: 154, b: 0 });
  });

  it("verwirft alles andere", () => {
    expect(parseHexColor("#abc")).toBeNull();
    expect(parseHexColor("red")).toBeNull();
    expect(parseHexColor("")).toBeNull();
  });

  it("schreibt zurück und klemmt auf 0–255", () => {
    expect(toHexColor({ r: 255, g: 154, b: 0 })).toBe("#ff9a00");
    expect(toHexColor({ r: -5, g: 300, b: 0.4 })).toBe("#00ff00");
  });
});

describe("relativeLuminance", () => {
  it("liefert die WCAG-Eckwerte", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  it("Schwarz auf Weiß ist 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
  });

  it("gleiche Farben ergeben 1:1", () => {
    expect(contrastRatio("#3a3a3a", "#3a3a3a")).toBeCloseTo(1, 5);
  });

  it("ist symmetrisch (Reihenfolge egal)", () => {
    const a = contrastRatio("#ff9a00", "#08081a");
    const b = contrastRatio("#08081a", "#ff9a00");
    expect(a).toBeCloseTo(b, 6);
  });

  it("belegt den behobenen Hellmodus-Fehler", () => {
    // Amber als Überschrift auf hellem Grund war unlesbar …
    expect(contrastRatio("#ff9a00", "#f4f4f8")).toBeLessThan(2);
    // … abgedunkelt (wie color-mode.css es per color-mix tut) besteht es AA.
    const inked = mixWithBlack("#ff9a00", LIGHT_ACCENT_INK_MIX);
    expect(contrastRatio(inked, "#f4f4f8")).toBeGreaterThanOrEqual(4.5);
  });

  it("belegt den vereinheitlichten ink-dim-Wert", () => {
    // alter Tailwind-Wert fiel durch, der vereinheitlichte besteht
    expect(contrastRatio("#6a5f9e", "#08081a")).toBeLessThan(4.5);
    expect(contrastRatio("#a39cc9", "#08081a")).toBeGreaterThanOrEqual(4.5);
  });

  it("ungültige Eingaben ergeben 1 statt eines Absturzes", () => {
    expect(contrastRatio("kaputt", "#ffffff")).toBe(1);
  });
});

describe("contrastLevel", () => {
  it("stuft Fließtext nach 4.5 / 7", () => {
    expect(contrastLevel(3.9, "text")).toBe("fail");
    expect(contrastLevel(4.5, "text")).toBe("warn");
    expect(contrastLevel(7.2, "text")).toBe("good");
  });

  it("stuft große Schrift und UI-Elemente nach 3 / 4.5", () => {
    expect(contrastLevel(2.9, "large")).toBe("fail");
    expect(contrastLevel(3.2, "large")).toBe("warn");
    expect(contrastLevel(4.6, "large")).toBe("good");
    expect(contrastLevel(2.9, "ui")).toBe("fail");
    expect(contrastLevel(4.6, "ui")).toBe("good");
  });

  it("hat die WCAG-Schwellen hinterlegt", () => {
    expect(CONTRAST_THRESHOLDS).toEqual({ text: 4.5, large: 3, ui: 3 });
  });
});

describe("mixWithBlack", () => {
  it("entspricht color-mix(in srgb, C pct%, #000)", () => {
    expect(mixWithBlack("#ff9a00", 45)).toBe("#734500");
    expect(mixWithBlack("#ffffff", 50)).toBe("#808080");
  });

  it("0% ist schwarz, 100% unverändert", () => {
    expect(mixWithBlack("#ff9a00", 0)).toBe("#000000");
    expect(mixWithBlack("#ff9a00", 100)).toBe("#ff9a00");
  });

  it("reicht ungültige Werte unverändert durch", () => {
    expect(mixWithBlack("nope", 45)).toBe("nope");
  });
});

describe("formatContrast", () => {
  it("rundet auf eine Nachkommastelle", () => {
    expect(formatContrast(7.4123)).toBe("7.4:1");
    expect(formatContrast(21)).toBe("21.0:1");
  });
});
