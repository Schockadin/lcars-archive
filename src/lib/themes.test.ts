import { describe, it, expect } from "vitest";
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  THEME_IDS,
  isValidThemeId,
  normalizeThemeId,
} from "./themes";

describe("themes registry", () => {
  it("enthält das Default-Theme und listet es zuerst", () => {
    expect(THEME_IDS).toContain(DEFAULT_THEME_ID);
    expect(COLOR_THEMES[0]?.id).toBe(DEFAULT_THEME_ID);
  });

  it("hat eindeutige IDs", () => {
    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length);
  });

  it("liefert für jedes Theme Label, Beschreibung und drei Swatch-Farben", () => {
    for (const theme of COLOR_THEMES) {
      expect(theme.label.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
      expect(theme.swatch).toHaveLength(3);
      for (const hex of theme.swatch) {
        expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("validiert bekannte gegen unbekannte IDs", () => {
    expect(isValidThemeId(DEFAULT_THEME_ID)).toBe(true);
    expect(isValidThemeId("science")).toBe(true);
    expect(isValidThemeId("does-not-exist")).toBe(false);
    expect(isValidThemeId("")).toBe(false);
  });

  it("normalisiert unbekannte/leere Werte auf das Default-Theme", () => {
    expect(normalizeThemeId("science")).toBe("science");
    expect(normalizeThemeId("does-not-exist")).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId(undefined)).toBe(DEFAULT_THEME_ID);
  });
});
