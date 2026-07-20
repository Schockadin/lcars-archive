import { describe, it, expect } from "vitest";
import {
  CHARACTER_COLOR_KEYS,
  isCharacterColorKey,
  resolveCharacterColor,
  characterColorVar,
  colorizeDirectSpeech,
} from "./characterColor";

describe("isCharacterColorKey", () => {
  it("accepts every palette key and rejects anything else", () => {
    for (const key of CHARACTER_COLOR_KEYS) {
      expect(isCharacterColorKey(key)).toBe(true);
    }
    expect(isCharacterColorKey("magenta")).toBe(false);
    expect(isCharacterColorKey(null)).toBe(false);
    expect(isCharacterColorKey(undefined)).toBe(false);
    expect(isCharacterColorKey(3)).toBe(false);
  });
});

describe("resolveCharacterColor", () => {
  it("returns an explicitly stored valid key unchanged", () => {
    expect(resolveCharacterColor("red", 1)).toBe("red");
    expect(resolveCharacterColor("green", 999)).toBe("green");
  });

  it("derives a deterministic palette color from the seed when unset/invalid", () => {
    const a = resolveCharacterColor(null, 7);
    const b = resolveCharacterColor(null, 7);
    const c = resolveCharacterColor("not-a-color", 7);
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(CHARACTER_COLOR_KEYS).toContain(a);
  });

  it("maps the seed cyclically over the palette", () => {
    expect(resolveCharacterColor(null, 0)).toBe(CHARACTER_COLOR_KEYS[0]);
    expect(resolveCharacterColor(null, CHARACTER_COLOR_KEYS.length)).toBe(
      CHARACTER_COLOR_KEYS[0],
    );
    expect(resolveCharacterColor(null, 1)).toBe(CHARACTER_COLOR_KEYS[1]);
  });

  it("handles negative seeds without crashing (stays in palette)", () => {
    const color = resolveCharacterColor(null, -3);
    expect(CHARACTER_COLOR_KEYS).toContain(color);
  });
});

describe("characterColorVar", () => {
  it("maps a key to its LCARS custom property", () => {
    expect(characterColorVar("amber")).toBe("var(--lcars-amber)");
    expect(characterColorVar("purple")).toBe("var(--lcars-purple)");
  });
});

describe("colorizeDirectSpeech", () => {
  // Deutsche Anführungszeichen unmissverständlich per \u-Escape (siehe
  // remarkGermanQuotes in markdown.ts: öffnend „ „, schließend “ “).
  const O = "„";
  const C = "“";

  it("wraps German direct speech in a colored span", () => {
    const out = colorizeDirectSpeech(
      `<p>${O}Hallo!${C} sagte er.</p>`,
      "var(--lcars-red)",
    );
    expect(out).toBe(
      `<p>${O}<span style="color:var(--lcars-red)">Hallo!</span>${C} sagte er.</p>`,
    );
  });

  it("colors multiple quotes in one fragment independently", () => {
    const out = colorizeDirectSpeech(
      `${O}A${C} x ${O}B${C}`,
      "var(--lcars-blue)",
    );
    expect(out).toBe(
      `${O}<span style="color:var(--lcars-blue)">A</span>${C} x ${O}<span style="color:var(--lcars-blue)">B</span>${C}`,
    );
  });

  it("leaves text without direct speech untouched", () => {
    const html = "<p>Er ging schweigend hinaus.</p>";
    expect(colorizeDirectSpeech(html, "var(--lcars-green)")).toBe(html);
  });

  it("keeps inline markup inside the quote intact", () => {
    const out = colorizeDirectSpeech(
      `${O}Hallo <a href="/x">Welt</a>${C}`,
      "var(--lcars-amber)",
    );
    expect(out).toBe(
      `${O}<span style="color:var(--lcars-amber)">Hallo <a href="/x">Welt</a></span>${C}`,
    );
  });
});
