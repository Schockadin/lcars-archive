import { describe, it, expect } from "vitest";
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  THEME_IDS,
  THEME_TOKENS,
  TOKEN_IDS,
  BASE_TOKENS,
  BASE_TOKEN_IDS,
  BASE_TOKEN_DEFAULTS,
  INK_TOKENS,
  SURFACE_TOKENS,
  OVERRIDE_TOKEN_VARS,
  isValidThemeId,
  normalizeThemeId,
  getTheme,
  themeSwatch,
  isValidTokenId,
  isOverridableToken,
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
    // isValidTokenId bleibt akzent-only — bg/ink sind KEINE Akzent-Tokens.
    expect(isValidTokenId("bg")).toBe(false);
    expect(isValidTokenId("ink")).toBe(false);
  });

  it("kennt die Flächen- und Schriftfarben-Tokens einzeln", () => {
    // Flächen zuerst, dann jede Textrolle — Reihenfolge wie im Formular.
    expect(SURFACE_TOKENS.map((t) => t.id)).toEqual([
      "bg",
      "surface",
      "surface-2",
      "border",
    ]);
    expect(INK_TOKENS.map((t) => t.id)).toEqual([
      "ink",
      "ink-light",
      "ink-dim",
      "ink-data",
      "ink-contrast",
      "ink-dark",
    ]);
    expect(BASE_TOKEN_IDS).toEqual([
      ...SURFACE_TOKENS.map((t) => t.id),
      ...INK_TOKENS.map((t) => t.id),
    ]);
    // Jedes Token trägt Label und Erklärung fürs Formular.
    for (const token of BASE_TOKENS) {
      expect(token.label.length, token.id).toBeGreaterThan(0);
      expect(token.hint.length, token.id).toBeGreaterThan(0);
    }
    // Für beide Modi liegen gültige Hex-Defaults vor.
    for (const mode of ["dark", "light"] as const) {
      for (const id of BASE_TOKEN_IDS) {
        expect(BASE_TOKEN_DEFAULTS[mode][id], `${mode}.${id}`).toMatch(
          /^#[0-9a-f]{6}$/,
        );
      }
    }
  });

  it("isOverridableToken deckt Akzent- UND Basis-Tokens ab", () => {
    expect(isOverridableToken("primary")).toBe(true);
    expect(isOverridableToken("bg")).toBe(true);
    expect(isOverridableToken("ink")).toBe(true);
    expect(isOverridableToken("nope")).toBe(false);
  });

  it("OVERRIDE_TOKEN_VARS bildet jede Rolle 1:1 auf ihre Variable ab", () => {
    // Durchgehend 1:1 — jede Rolle (Akzent, Fläche, Schrift) ist damit
    // unabhängig von den übrigen einstellbar.
    for (const id of [...TOKEN_IDS, ...BASE_TOKEN_IDS]) {
      expect(OVERRIDE_TOKEN_VARS[id], id).toEqual([id]);
    }
    // Und es gibt keine weiteren (verwaisten) Einträge.
    expect(Object.keys(OVERRIDE_TOKEN_VARS).sort()).toEqual(
      [...TOKEN_IDS, ...BASE_TOKEN_IDS].sort(),
    );
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
        unknownKey: "#000000",
        secondary: "green",
        tertiary: "#00ff00",
      }),
    ).toEqual({ primary: "#ff0000", tertiary: "#00ff00" });
    expect(sanitizeThemeOverrides(null)).toEqual({});
    expect(sanitizeThemeOverrides("x")).toEqual({});
  });

  it("sanitize akzeptiert die Basis-Tokens bg/ink", () => {
    expect(
      sanitizeThemeOverrides({ bg: "#101020", ink: "#EEEEFF" }),
    ).toEqual({ bg: "#101020", ink: "#eeeeff" });
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
    expect(decodeThemeOverrides("primary:zzzzzz,unknown:000000,broken")).toEqual(
      {},
    );
    expect(decodeThemeOverrides("primary:ff0000")).toEqual({ primary: "#ff0000" });
  });

  it("kodiert/dekodiert auch die Basis-Tokens bg/ink", () => {
    const o = { bg: "#101020", ink: "#eeeeff" } as const;
    const enc = encodeThemeOverrides(o);
    expect(enc).toBe("bg:101020,ink:eeeeff");
    expect(decodeThemeOverrides(enc)).toEqual(o);
  });
});
