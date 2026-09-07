import { describe, it, expect } from "vitest";
import {
  UI_MODE_LCARS,
  UI_MODE_MINIMAL,
  UI_MODE_MINIMAL_LIGHT_LEGACY,
  DEFAULT_UI_MODE,
  isValidUiMode,
  normalizeUiMode,
  isMinimalUiMode,
  legacyColorModeFromUiMode,
} from "./uiMode";

describe("uiMode registry", () => {
  it("nutzt LCARS als Default", () => {
    expect(DEFAULT_UI_MODE).toBe(UI_MODE_LCARS);
  });

  it("validiert nur die beiden aktuellen Modi (nicht den Alt-Wert)", () => {
    expect(isValidUiMode(UI_MODE_LCARS)).toBe(true);
    expect(isValidUiMode(UI_MODE_MINIMAL)).toBe(true);
    // Hell/Dunkel ist keine UI-Modus-Variante mehr.
    expect(isValidUiMode(UI_MODE_MINIMAL_LIGHT_LEGACY)).toBe(false);
    expect(isValidUiMode("nope")).toBe(false);
  });

  it("bildet den Alt-Wert 'minimal-light' auf 'minimal' ab", () => {
    expect(normalizeUiMode(UI_MODE_MINIMAL_LIGHT_LEGACY)).toBe(UI_MODE_MINIMAL);
    expect(normalizeUiMode(UI_MODE_MINIMAL)).toBe(UI_MODE_MINIMAL);
    expect(normalizeUiMode(UI_MODE_LCARS)).toBe(UI_MODE_LCARS);
    expect(normalizeUiMode("nonsense")).toBe(UI_MODE_LCARS);
    expect(normalizeUiMode(null)).toBe(UI_MODE_LCARS);
  });

  it("isMinimalUiMode gilt für 'minimal' und den Alt-Wert", () => {
    expect(isMinimalUiMode(UI_MODE_MINIMAL)).toBe(true);
    expect(isMinimalUiMode(UI_MODE_MINIMAL_LIGHT_LEGACY)).toBe(true);
    expect(isMinimalUiMode(UI_MODE_LCARS)).toBe(false);
  });

  it("leitet aus dem Alt-Wert die Helligkeit ab", () => {
    expect(legacyColorModeFromUiMode(UI_MODE_MINIMAL_LIGHT_LEGACY)).toBe("light");
    expect(legacyColorModeFromUiMode(UI_MODE_MINIMAL)).toBe("dark");
    expect(legacyColorModeFromUiMode(UI_MODE_LCARS)).toBe("dark");
    expect(legacyColorModeFromUiMode(null)).toBe("dark");
  });
});
