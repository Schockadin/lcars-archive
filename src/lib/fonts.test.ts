import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FONT_SANS_OPTIONS,
  FONT_MONO_OPTIONS,
  DEFAULT_FONT_SANS,
  DEFAULT_FONT_MONO,
  normalizeFontSans,
  normalizeFontMono,
  isValidFontSans,
  isValidFontMono,
  fontSansLabel,
  fontMonoLabel,
} from "./fonts";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Schrift-Registry", () => {
  it("hat eindeutige ids und CSS-Variablen", () => {
    const options = [...FONT_SANS_OPTIONS, ...FONT_MONO_OPTIONS];
    const ids = options.map((option) => option.id);
    const variables = options.map((option) => option.cssVariable);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(variables).size).toBe(variables.length);
  });

  it("führt die Vorgaben als erste Wahl", () => {
    expect(FONT_SANS_OPTIONS[0].id).toBe(DEFAULT_FONT_SANS);
    expect(FONT_MONO_OPTIONS[0].id).toBe(DEFAULT_FONT_MONO);
  });

  it("bietet zu jeder Vorgabe mindestens eine Alternative", () => {
    expect(FONT_SANS_OPTIONS.length).toBeGreaterThan(1);
    expect(FONT_MONO_OPTIONS.length).toBeGreaterThan(1);
  });

  it("normalisiert Unbekanntes still auf die Vorgabe", () => {
    expect(normalizeFontSans("gibt-es-nicht")).toBe(DEFAULT_FONT_SANS);
    expect(normalizeFontSans(null)).toBe(DEFAULT_FONT_SANS);
    expect(normalizeFontSans("inter")).toBe("inter");
    expect(normalizeFontMono(undefined)).toBe(DEFAULT_FONT_MONO);
    expect(normalizeFontMono("roboto-mono")).toBe("roboto-mono");
    // Die Achsen sind getrennt: eine Mono-Id ist keine gültige Textschrift.
    expect(normalizeFontSans("roboto-mono")).toBe(DEFAULT_FONT_SANS);
    expect(isValidFontSans("roboto-mono")).toBe(false);
    expect(isValidFontMono("inter")).toBe(false);
  });

  it("liefert zu jeder id ihre Beschriftung", () => {
    expect(fontSansLabel(DEFAULT_FONT_SANS)).toBe("Antonio");
    expect(fontMonoLabel(DEFAULT_FONT_MONO)).toBe("Share Tech Mono");
    // Unbekanntes fällt auf die Vorgabe zurück, nicht auf einen leeren Text.
    expect(fontSansLabel("gibt-es-nicht")).toBe("Antonio");
  });
});

// Die Registry ist nur die halbe Wahrheit: geladen werden die Schriften
// lokal in font-definitions.ts und angewandt in fonts.css. Fehlt eine der
// beiden Stellen, bliebe eine wählbare Schrift wirkungslos.
describe("Kopplung an Layout und Stylesheet", () => {
  it("bindet alle Schriften lokal über next/font/local ein", () => {
    const layout = read("src/app/layout.tsx");
    const definitions = read("src/app/font-definitions.ts");
    const globalError = read("src/app/global-error.tsx");
    expect(layout).toContain("./font-definitions");
    expect(layout).not.toContain("next/font/google");
    expect(globalError).toContain("./font-definitions");
    expect(globalError).not.toContain("next/font/google");
    expect(definitions).toContain("next/font/local");
    for (const option of [...FONT_SANS_OPTIONS, ...FONT_MONO_OPTIONS]) {
      expect(definitions).toContain(`variable: "${option.cssVariable}"`);
    }
    for (const file of [
      "antonio-latin.woff2",
      "share-tech-mono-latin.woff2",
      "inter-latin.woff2",
      "roboto-latin.woff2",
      "open-sans-latin.woff2",
      "jetbrains-mono-latin.woff2",
      "roboto-mono-latin.woff2",
      "source-code-pro-latin.woff2",
    ]) {
      expect(existsSync(join(process.cwd(), "src/app/fonts", file))).toBe(true);
    }
  });

  it("hängt jede Alternative in fonts.css auf den kanonischen Stack", () => {
    const css = read("src/styles/fonts.css");
    for (const option of FONT_SANS_OPTIONS) {
      if (option.id === DEFAULT_FONT_SANS) continue;
      expect(css).toContain(`html[data-font-sans="${option.id}"]`);
      expect(css).toContain(`var(${option.cssVariable})`);
    }
    for (const option of FONT_MONO_OPTIONS) {
      if (option.id === DEFAULT_FONT_MONO) continue;
      expect(css).toContain(`html[data-font-mono="${option.id}"]`);
      expect(css).toContain(`var(${option.cssVariable})`);
    }
  });

  it("setzt für die Vorgaben KEIN Attribut (tokens.css trägt sie)", () => {
    const css = read("src/styles/fonts.css");
    expect(css).not.toContain(`html[data-font-sans="${DEFAULT_FONT_SANS}"] {`);
    expect(css).not.toContain(`html[data-font-mono="${DEFAULT_FONT_MONO}"] {`);
    const tokens = read("src/styles/tokens.css");
    expect(tokens).toContain("--lcars-font-sans:");
    expect(tokens).toContain("--lcars-font-mono:");
  });
});
