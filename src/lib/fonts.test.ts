import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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

// Die Registry ist nur die halbe Wahrheit: geladen werden die Schriften in
// layout.tsx (next/font) und angewandt in fonts.css. Fehlt eine der beiden
// Stellen, bliebe eine wählbare Schrift wirkungslos — und zwar still, weil
// ein var() ohne Fallback die ganze Deklaration ungültig macht (dieselbe
// Falle wie bei --font-share-tech-mono, siehe e2e/fonts.spec.ts).
describe("Kopplung an Layout und Stylesheet", () => {
  it("meldet jede Schrift in layout.tsx per next/font an", () => {
    const layout = read("src/app/layout.tsx");
    for (const option of [...FONT_SANS_OPTIONS, ...FONT_MONO_OPTIONS]) {
      expect(layout).toContain(`variable: "${option.cssVariable}"`);
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
