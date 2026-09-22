import { describe, it, expect } from "vitest";
import {
  LCARS_COLOR_PRESETS,
  PRESET_HEXES,
  isHexColor,
  normalizeHex,
  resolveCharacterColor,
  resolveCharacterDefaultColor,
  takenColorsForCharacter,
  colorizeDirectSpeech,
} from "./characterColor";

describe("isHexColor", () => {
  it("accepts #rrggbb and rejects anything else", () => {
    expect(isHexColor("#ff9a00")).toBe(true);
    expect(isHexColor("#FFAA00")).toBe(true);
    expect(isHexColor("ff9a00")).toBe(false);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("#gggggg")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });
});

describe("normalizeHex", () => {
  it("lowercases", () => {
    expect(normalizeHex("#FFAA00")).toBe("#ffaa00");
  });
});

describe("resolveCharacterColor", () => {
  it("returns a stored valid hex (normalized)", () => {
    expect(resolveCharacterColor("#AABBCC", 1)).toBe("#aabbcc");
  });

  it("derives a deterministic preset hex when unset/invalid", () => {
    const a = resolveCharacterColor(null, 7);
    const b = resolveCharacterColor("not-a-color", 7);
    expect(a).toBe(b);
    expect(PRESET_HEXES).toContain(a);
  });

  it("maps the seed cyclically over the presets", () => {
    expect(resolveCharacterColor(null, 0)).toBe(PRESET_HEXES[0]);
    expect(resolveCharacterColor(null, PRESET_HEXES.length)).toBe(
      PRESET_HEXES[0],
    );
    expect(resolveCharacterColor(null, 1)).toBe(PRESET_HEXES[1]);
  });

  it("handles negative seeds without crashing", () => {
    expect(PRESET_HEXES).toContain(resolveCharacterColor(null, -3));
  });
});

describe("resolveCharacterDefaultColor", () => {
  it("returns the stored hex regardless of taken set", () => {
    expect(
      resolveCharacterDefaultColor("#123456", 1, new Set(["#123456"])),
    ).toBe("#123456");
  });

  it("skips taken presets when deriving a default", () => {
    // seed 0 would normally give PRESET_HEXES[0]; mark it taken → next free.
    const taken = new Set([PRESET_HEXES[0]]);
    const out = resolveCharacterDefaultColor(null, 0, taken);
    expect(out).toBe(PRESET_HEXES[1]);
    expect(taken.has(out)).toBe(false);
  });

  it("falls back to the deterministic value if all presets are taken", () => {
    const taken = new Set(PRESET_HEXES);
    const out = resolveCharacterDefaultColor(null, 2, taken);
    expect(out).toBe(PRESET_HEXES[2]);
  });
});

describe("takenColorsForCharacter", () => {
  const used = [
    { id: 1, color: "#ff9a00" },
    { id: 2, color: "#CD9ACD" },
    { id: 3, color: "#9a9aff" },
  ];

  it("excludes only the character's own color", () => {
    expect(takenColorsForCharacter(2, used)).toEqual(["#ff9a00", "#9a9aff"]);
  });

  it("keeps the colors of the same user's other characters", () => {
    // Der partielle UNIQUE-Index sperrt global — die Farbe eines zweiten
    // eigenen Charakters bleibt für den ersten also belegt.
    expect(takenColorsForCharacter(1, used)).toContain("#cd9acd");
  });

  it("normalizes to lowercase for comparison with the presets", () => {
    expect(takenColorsForCharacter(1, used)).toEqual(["#cd9acd", "#9a9aff"]);
  });

  it("returns every color when the character has none itself", () => {
    expect(takenColorsForCharacter(99, used)).toHaveLength(3);
  });

  it("returns an empty list when no color is in use at all", () => {
    expect(takenColorsForCharacter(1, [])).toEqual([]);
  });

  it("feeds resolveCharacterDefaultColor a set that skips taken presets", () => {
    // Zusammenspiel wie in src/app/user/page.tsx: der vorgeschlagene Default
    // darf keine bereits belegte Preset-Farbe sein, sonst ist er nicht
    // speicherbar.
    const takenAll = PRESET_HEXES.slice(0, 2).map((hex, i) => ({
      id: i + 10,
      color: hex,
    }));
    const taken = new Set(takenColorsForCharacter(1, takenAll));
    const suggested = resolveCharacterDefaultColor(null, 0, taken);
    expect(taken.has(suggested)).toBe(false);
  });
});

describe("LCARS_COLOR_PRESETS", () => {
  it("all preset hexes are valid and unique", () => {
    for (const p of LCARS_COLOR_PRESETS) expect(isHexColor(p.hex)).toBe(true);
    expect(new Set(PRESET_HEXES).size).toBe(PRESET_HEXES.length);
  });
});

describe("colorizeDirectSpeech", () => {
  // Deutsche Anführungszeichen unmissverständlich per Variable (öffnend „,
  // schließend “, siehe remarkGermanQuotes in markdown.ts).
  const O = "„";
  const C = "“";

  // Findet ein <span>, dessen Inhalt (bis zu seinem </span>) eine
  // Absatzgrenze enthält — genau der Fehler, um den es hier geht. Der
  // Browser repariert so etwas still, im String steht es aber.
  function spanUeberspanntBlock(html: string): boolean {
    return /<span[^>]*>(?:(?!<\/span>)[\s\S])*<\/p>/.test(html);
  }

  it("wraps the quotes AND the inner text in a colored span", () => {
    const out = colorizeDirectSpeech(
      `<p>${O}Hallo!${C} sagte er.</p>`,
      "#cd6666",
    );
    expect(out).toBe(
      `<p><span style="color:#cd6666">${O}Hallo!${C}</span> sagte er.</p>`,
    );
  });

  it("colors multiple quotes independently", () => {
    const out = colorizeDirectSpeech(`${O}A${C} x ${O}B${C}`, "#9a9aff");
    expect(out).toBe(
      `<span style="color:#9a9aff">${O}A${C}</span> x <span style="color:#9a9aff">${O}B${C}</span>`,
    );
  });

  it("leaves text without direct speech untouched", () => {
    const html = "<p>Er ging schweigend hinaus.</p>";
    expect(colorizeDirectSpeech(html, "#6bcb8b")).toBe(html);
  });

  // Der Fehler, um den es ging: Eine Rede über zwei Absätze bekam EIN span
  // von „ bis “, das die Absatzgrenze überspannte. Der Browser schließt es
  // am </p> — gefärbt war nur der erste Absatz. Jeder Block braucht sein
  // eigenes span.
  it("colors every paragraph of a speech that spans a paragraph break", () => {
    const out = colorizeDirectSpeech(
      `<p>${O}Lorem ipsum</p>\n<p>dolor amit${C}</p>`,
      "#ff9a00",
    );
    expect(out).toBe(
      `<p><span style="color:#ff9a00">${O}Lorem ipsum</span></p>\n` +
        `<p><span style="color:#ff9a00">dolor amit${C}</span></p>`,
    );
    expect(spanUeberspanntBlock(out)).toBe(false);
  });

  it("keeps the colored spans inside their blocks across three paragraphs", () => {
    const out = colorizeDirectSpeech(
      `<p>${O}A</p><p>B</p><p>C${C}</p>`,
      "#6bcb8b",
    );
    for (const teil of ["A", "B", "C"]) {
      expect(out).toContain(`<span style="color:#6bcb8b">`);
      expect(out).toContain(teil);
    }
    // Drei Blöcke, drei spans — und jedes wieder geschlossen.
    expect(out.match(/<span /g)?.length).toBe(3);
    expect(out.match(/<\/span>/g)?.length).toBe(3);
    expect(spanUeberspanntBlock(out)).toBe(false);
  });

  // Zwischen </p> und <p> steht im gerenderten Markdown oft ein Zeilenumbruch.
  // Der gehört zu keinem Block und darf deshalb kein span bekommen.
  it("leaves the whitespace between two blocks unwrapped", () => {
    const out = colorizeDirectSpeech(
      `<p>${O}Eins</p>\n\n<p>Zwei${C}</p>`,
      "#cd6666",
    );
    expect(out).toContain(`</p>\n\n<p>`);
  });

  // Nicht nur der Absatz: An JEDER Blockgrenze endet die Einfärbung, sonst
  // stünde ein <span> um Markup, das es nicht umschließen darf. Die Liste
  // folgt der Allowlist, durch die der Text kommt (defaultSchema von
  // rehype-sanitize) — details/summary gehören dazu.
  it.each(["li", "blockquote", "td", "details"])(
    "schließt die Einfärbung auch an der Grenze von <%s>",
    (tag) => {
      const out = colorizeDirectSpeech(
        `<${tag}>${O}Eins</${tag}><${tag}>Zwei${C}</${tag}>`,
        "#ff9a66",
      );
      const ueberspannt = new RegExp(
        `<span[^>]*>(?:(?!<\\/span>)[\\s\\S])*<\\/${tag}>`,
      );
      expect(ueberspannt.test(out)).toBe(false);
      // Und beide Hälften tragen trotzdem Farbe.
      expect(out.match(/<span /g)?.length).toBe(2);
    },
  );

  // Ein „ in einem Attributwert ist kein Redeanfang — Tags werden
  // übersprungen, nicht mitgelesen.
  it("ignores quote characters inside tags", () => {
    const html = `<p><a href="/x" title="${O}y${C}">Link</a></p>`;
    expect(colorizeDirectSpeech(html, "#9a9aff")).toBe(html);
  });

  // Ohne Gegenstück färbt die Rede bis zum Blockende: dieselbe Regel wie über
  // Absätze hinweg, nur ohne Ende.
  it("colors to the end of the block when the closing quote is missing", () => {
    const out = colorizeDirectSpeech(`<p>${O}Hallo</p>`, "#cd9acd");
    expect(out).toBe(`<p><span style="color:#cd9acd">${O}Hallo</span></p>`);
  });

  it("keeps inline markup inside the quote intact", () => {
    const out = colorizeDirectSpeech(
      `${O}Hallo <a href="/x">Welt</a>${C}`,
      "#ff9a00",
    );
    expect(out).toBe(
      `<span style="color:#ff9a00">${O}Hallo <a href="/x">Welt</a>${C}</span>`,
    );
  });
});
