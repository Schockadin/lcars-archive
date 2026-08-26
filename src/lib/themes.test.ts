import { describe, it, expect } from "vitest";
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  THEME_IDS,
  THEME_TOKENS,
  TOKEN_IDS,
  isValidThemeId,
  normalizeThemeId,
  getTheme,
  themeSwatch,
  isValidTokenId,
  isValidHexColor,
  normalizeHexColor,
  sanitizeThemeOverrides,
  encodeThemeOverrides,
  decodeThemeOverrides,
} from "./themes";

describe("themes registry", () => {
  it("enthält das Default-Theme und listet es zuerst", () => {
    expect(THEME_IDS).toContain(DEFAULT_THEME_ID);
    expect(COLOR_THEMES[0]?.id).toBe(DEFAULT_THEME_ID);
  });

  it("hat eindeutige IDs", () => {
    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length);
  });

  it("liefert für jedes Theme Label, Beschreibung und alle 7 Token-Farben", () => {
    for (const theme of COLOR_THEMES) {
      expect(theme.label.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
      for (const { id } of THEME_TOKENS) {
        const hex = theme.tokens[id];
        expect(hex, `${theme.id}.${id}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("themeSwatch liefert primary/secondary/tertiary", () => {
    const t = getTheme("classic");
    expect(themeSwatch(t)).toEqual([
      t.tokens.primary,
      t.tokens.secondary,
      t.tokens.tertiary,
    ]);
  });

  it("validiert/normalisiert Theme-IDs", () => {
    expect(isValidThemeId(DEFAULT_THEME_ID)).toBe(true);
    expect(isValidThemeId("does-not-exist")).toBe(false);
    expect(normalizeThemeId("science")).toBe("science");
    expect(normalizeThemeId("nope")).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(getTheme("nope").id).toBe(DEFAULT_THEME_ID);
  });
});

describe("token overrides", () => {
  it("kennt genau die sieben Akzent-Tokens", () => {
    expect(TOKEN_IDS).toEqual([
      "primary",
      "primary-light",
      "secondary",
      "tertiary",
      "quaternary",
      "quinary",
      "senary",
    ]);
    expect(isValidTokenId("primary")).toBe(true);
    expect(isValidTokenId("bg")).toBe(false);
  });

  it("validiert und normalisiert Hex-Farben", () => {
    expect(isValidHexColor("#ff9900")).toBe(true);
    expect(isValidHexColor("#FF9900")).toBe(true);
    expect(isValidHexColor("#abc")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(normalizeHexColor("  #FF9900 ")).toBe("#ff9900");
    expect(normalizeHexColor("#abc")).toBeNull();
    expect(normalizeHexColor("nope")).toBeNull();
  });

  it("sanitize verwirft unbekannte Keys und ungültige Farben", () => {
    expect(
      sanitizeThemeOverrides({
        primary: "#FF0000",
        bg: "#000000",
        secondary: "green",
        tertiary: "#00ff00",
      }),
    ).toEqual({ primary: "#ff0000", tertiary: "#00ff00" });
    expect(sanitizeThemeOverrides(null)).toEqual({});
    expect(sanitizeThemeOverrides("x")).toEqual({});
  });

  it("kodiert und dekodiert Overrides verlustfrei (roundtrip)", () => {
    const o = { primary: "#ff9900", tertiary: "#00ccff" } as const;
    const enc = encodeThemeOverrides(o);
    expect(enc).toBe("primary:ff9900,tertiary:00ccff");
    expect(decodeThemeOverrides(enc)).toEqual(o);
  });

  it("decode ist robust gegen Müll", () => {
    expect(decodeThemeOverrides("")).toEqual({});
    expect(decodeThemeOverrides(null)).toEqual({});
    expect(decodeThemeOverrides("primary:zzzzzz,bg:000000,broken")).toEqual({});
    expect(decodeThemeOverrides("primary:ff0000")).toEqual({ primary: "#ff0000" });
  });
});
