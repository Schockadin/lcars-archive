import { describe, it, expect } from "vitest";
import {
  COLOR_MODE_COOKIE_NAME,
  COLOR_MODE_DARK,
  COLOR_MODE_LIGHT,
  DEFAULT_COLOR_MODE,
  isValidColorMode,
  normalizeColorMode,
  isLightMode,
} from "./colorMode";

describe("colorMode registry", () => {
  it("nutzt dunkel als Default und ein stabiles Cookie", () => {
    expect(DEFAULT_COLOR_MODE).toBe(COLOR_MODE_DARK);
    expect(COLOR_MODE_COOKIE_NAME).toBe("neo_mode");
  });

  it("validiert nur die beiden bekannten Modi", () => {
    expect(isValidColorMode(COLOR_MODE_DARK)).toBe(true);
    expect(isValidColorMode(COLOR_MODE_LIGHT)).toBe(true);
    expect(isValidColorMode("minimal-light")).toBe(false);
    expect(isValidColorMode("")).toBe(false);
  });

  it("normalisiert unbekannte/leere Werte auf dunkel", () => {
    expect(normalizeColorMode(COLOR_MODE_LIGHT)).toBe(COLOR_MODE_LIGHT);
    expect(normalizeColorMode(COLOR_MODE_DARK)).toBe(COLOR_MODE_DARK);
    expect(normalizeColorMode("nope")).toBe(COLOR_MODE_DARK);
    expect(normalizeColorMode(null)).toBe(COLOR_MODE_DARK);
    expect(normalizeColorMode(undefined)).toBe(COLOR_MODE_DARK);
  });

  it("isLightMode ist nur für 'light' wahr", () => {
    expect(isLightMode(COLOR_MODE_LIGHT)).toBe(true);
    expect(isLightMode(COLOR_MODE_DARK)).toBe(false);
    expect(isLightMode("nonsense")).toBe(false);
    expect(isLightMode(null)).toBe(false);
  });
});
