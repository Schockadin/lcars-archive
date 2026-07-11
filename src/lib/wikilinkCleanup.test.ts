import { describe, it, expect } from "vitest";
import { stripWikilinks } from "./wikilinkCleanup";

describe("stripWikilinks", () => {
  it("replaces a plain wikilink with its target text", () => {
    const result = stripWikilinks("Ein Treffen mit [[Desmond Hobbes]].");
    expect(result.sourceMd).toBe("Ein Treffen mit Desmond Hobbes.");
    expect(result.removed).toEqual([
      { original: "[[Desmond Hobbes]]", replacement: "Desmond Hobbes" },
    ]);
  });

  it("uses the alias instead of the target when present", () => {
    const result = stripWikilinks("Er traf [[Desmond Hobbes|den Captain]].");
    expect(result.sourceMd).toBe("Er traf den Captain.");
    expect(result.removed).toEqual([
      {
        original: "[[Desmond Hobbes|den Captain]]",
        replacement: "den Captain",
      },
    ]);
  });

  it("handles multiple wikilinks in the same text", () => {
    const result = stripWikilinks("[[A]] traf [[B|B2]] auf [[C]].");
    expect(result.sourceMd).toBe("A traf B2 auf C.");
    expect(result.removed).toHaveLength(3);
  });

  it("leaves text without wikilinks untouched", () => {
    const result = stripWikilinks("Ganz normaler Text ohne Links.");
    expect(result.sourceMd).toBe("Ganz normaler Text ohne Links.");
    expect(result.removed).toEqual([]);
  });

  it("does not touch wikilink-like syntax inside a fenced code block", () => {
    const md = "Text davor.\n```\n[[Nicht anfassen]]\n```\nText danach.";
    const result = stripWikilinks(md);
    expect(result.sourceMd).toBe(md);
    expect(result.removed).toEqual([]);
  });

  it("does not touch wikilink-like syntax inside inline code", () => {
    const md = "Beispiel: `[[Nicht anfassen]]` im Fließtext.";
    const result = stripWikilinks(md);
    expect(result.sourceMd).toBe(md);
    expect(result.removed).toEqual([]);
  });

  it("does not touch wikilink-like syntax inside an image URL", () => {
    const md = "![alt](https://example.com/[[nicht-anfassen]].png)";
    const result = stripWikilinks(md);
    expect(result.sourceMd).toBe(md);
    expect(result.removed).toEqual([]);
  });

  it("strips a #section anchor from the target before display", () => {
    const result = stripWikilinks("Siehe [[Artikel#Abschnitt]].");
    expect(result.sourceMd).toBe("Siehe Artikel.");
  });
});
