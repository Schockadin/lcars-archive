import { describe, it, expect } from "vitest";
import {
  chunkContent,
  splitByTokens,
  splitMarkdownByHeadings,
  estimateTokens,
  toVectorLiteral,
} from "./embeddings";

// Erzeugt einen Text mit ungefähr `tokens` geschätzten Tokens (≈4 Zeichen/
// Token) aus mehreren Absätzen, deren Sätze mit Punkt enden. Beides ist
// bewusst so: splitByTokens schneidet an Absatzgrenzen (\n\n), fällt aber auf
// Satzgrenzen zurück — und stripMarkdown (in chunkContent) kollabiert die
// \n\n zu Leerzeichen, sodass dann nur noch die Satzpunkte als Schnittstellen
// bleiben (wie bei echtem deutschem Fließtext).
function textOfTokens(tokens: number): string {
  const paras: string[] = [];
  let remaining = tokens;
  let n = 0;
  while (remaining > 0) {
    const sentences: string[] = [];
    // Jeder Absatz besteht aus mehreren kurzen Sätzen.
    for (let s = 0; s < 3 && remaining > 0; s++) {
      const sentenceTokens = Math.min(30, remaining);
      const words = Math.max(3, Math.round((sentenceTokens * 4) / 5));
      sentences.push(
        Array.from({ length: words }, (_, i) => `wort${n}s${s}i${i}`).join(" ") + ".",
      );
      remaining -= sentenceTokens;
    }
    paras.push(sentences.join(" "));
    n++;
  }
  return paras.join("\n\n");
}

describe("estimateTokens", () => {
  it("nähert ~4 Zeichen pro Token", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("splitByTokens", () => {
  it("kurzer Text bleibt ein einziger Chunk", () => {
    const text = textOfTokens(100);
    expect(splitByTokens(text, 800, 100)).toHaveLength(1);
  });

  it("leerer Text ergibt keine Chunks", () => {
    expect(splitByTokens("   ", 800, 100)).toEqual([]);
  });

  it("langer Text wird in mehrere Chunks geteilt", () => {
    const text = textOfTokens(2400); // ~3x Ziel
    const chunks = splitByTokens(text, 800, 100);
    expect(chunks.length).toBeGreaterThan(1);
    // Jeder Chunk hält das Ziel grob ein (Overlap kann leicht überschreiten).
    for (const c of chunks) {
      expect(estimateTokens(c)).toBeLessThanOrEqual(1000);
    }
  });

  it("teilt auch einen einzelnen überlangen Absatz (an Satzgrenzen)", () => {
    const sentence = "Dies ist ein Satz mit einigen Worten. ";
    const longParagraph = sentence.repeat(400); // weit über Ziel, ein Absatz
    const chunks = splitByTokens(longParagraph, 200, 20);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("overlap=0 dupliziert den vorigen Chunk NICHT (slice(-0)-Falle)", () => {
    const text = textOfTokens(2400);
    const chunks = splitByTokens(text, 800, 0);
    expect(chunks.length).toBeGreaterThan(1);
    // Ohne Overlap darf die Summe der Chunk-Längen die Eingabe nur minimal
    // überschreiten (Trenner). Mit der slice(-0)-Falle würde jeder Chunk den
    // kompletten Vorgänger mitschleppen → ein Vielfaches der Eingabelänge.
    const total = chunks.reduce((n, c) => n + c.length, 0);
    expect(total).toBeLessThan(text.length * 1.2);
  });
});

describe("splitMarkdownByHeadings", () => {
  it("teilt an ATX-Überschriften und behält den Text davor", () => {
    const md = "Einleitung.\n\n# Kapitel 1\nInhalt eins.\n\n## Kapitel 2\nInhalt zwei.";
    const sections = splitMarkdownByHeadings(md);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toContain("Einleitung");
    expect(sections[1]).toContain("# Kapitel 1");
    expect(sections[2]).toContain("## Kapitel 2");
  });

  it("ohne Überschriften bleibt alles ein Abschnitt", () => {
    expect(splitMarkdownByHeadings("Nur Fließtext ohne Heading.")).toHaveLength(1);
  });
});

describe("chunkContent — Charakter", () => {
  it("erzeugt genau einen Chunk mit Metadaten-Header", () => {
    const chunks = chunkContent({
      type: "character",
      record: {
        name: "James Kirk",
        species: "Mensch",
        rank: "Captain",
        status: "active",
        sourceMd: "**Kirk** ist der Captain der Enterprise.",
      },
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].text).toContain("Charakter: James Kirk");
    expect(chunks[0].text).toContain("Spezies: Mensch");
    // Markdown-Betonung ist entfernt (stripMarkdown).
    expect(chunks[0].text).toContain("Kirk ist der Captain");
    expect(chunks[0].text).not.toContain("**");
  });

  it("behält auch ohne Bio einen Steckbrief-Chunk", () => {
    const chunks = chunkContent({
      type: "character",
      record: { name: "Spock", sourceMd: null, fallbackText: null },
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("Charakter: Spock");
  });
});

describe("chunkContent — Mission", () => {
  it("ein Chunk mit Header", () => {
    const chunks = chunkContent({
      type: "mission",
      record: {
        title: "Erster Kontakt",
        status: "completed",
        startedAt: "2380-01-01",
        endedAt: null,
        sourceMd: "Die Crew trifft auf eine neue Spezies.",
      },
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("Mission: Erster Kontakt");
    expect(chunks[0].text).toContain("neue Spezies");
  });
});

describe("chunkContent — Mission-Log", () => {
  it("kurzer Log = ein Chunk mit Header", () => {
    const chunks = chunkContent({
      type: "mission_log",
      record: {
        title: "Session 1",
        missionTitle: "Erster Kontakt",
        authorName: "Kirk",
        sessionNr: 1,
        logDate: "2380-01-02",
        sourceMd: "Kurzer Bericht.",
      },
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("Mission: Erster Kontakt");
    expect(chunks[0].text).toContain("Autor: Kirk");
  });

  it("langer Log wird in mehrere Chunks geteilt, jeder mit Header", () => {
    const chunks = chunkContent({
      type: "mission_log",
      record: {
        title: "Marathon",
        missionTitle: "Lange Mission",
        authorName: "Data",
        sessionNr: 7,
        sourceMd: textOfTokens(2400),
      },
    });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text).toContain("Einsatzbericht: Marathon");
    }
    // Indizes sind fortlaufend ab 0.
    expect(chunks.map((c) => c.index)).toEqual(
      chunks.map((_, i) => i),
    );
  });
});

describe("chunkContent — Datenbank-Eintrag", () => {
  it("kurzer Eintrag = ein Chunk", () => {
    const chunks = chunkContent({
      type: "archive_entry",
      record: {
        title: "Tholianer",
        category: "species",
        setting: null,
        sourceMd: "# Tholianer\nEine kristalline Spezies.",
      },
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("Datenbank-Eintrag: Tholianer");
    expect(chunks[0].text).toContain("kristalline Spezies");
  });

  it("langer Eintrag wird an Heading-Grenzen geteilt", () => {
    const section = (h: string) => `# ${h}\n\n${textOfTokens(500)}`;
    const md = [section("Alpha"), section("Beta"), section("Gamma")].join("\n\n");
    const chunks = chunkContent({
      type: "archive_entry",
      record: { title: "Langer Eintrag", category: "faction", sourceMd: md },
    });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text).toContain("Datenbank-Eintrag: Langer Eintrag");
    }
  });
});

describe("chunkContent — Dialog", () => {
  it("aggregiert zu einem Chunk mit Teilnehmer-Header", () => {
    const chunks = chunkContent({
      type: "dialogue",
      record: {
        title: "Gespräch auf der Brücke",
        setting: "Brücke",
        participants: ["Kirk", "Spock"],
        sourceMd: "Kirk: Bericht?\n\nSpock: Faszinierend.",
      },
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("Teilnehmer: Kirk, Spock");
    expect(chunks[0].text).toContain("Faszinierend");
  });

  it("langer Dialog wird gesplittet (OpenAI-8192-Token-Limit)", () => {
    const chunks = chunkContent({
      type: "dialogue",
      record: {
        title: "Endlos-Debatte",
        participants: ["Kirk", "Spock"],
        sourceMd: textOfTokens(6000), // weit über dem Ein-Chunk-Ziel
      },
    });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text).toContain("Gespräch: Endlos-Debatte");
    }
  });
});

// Absicherung gegen den 8192-Token-Fehler aus der Praxis: KEIN Chunk darf die
// harte Zeichen-Obergrenze (8000, siehe HARD_MAX_CHARS) überschreiten — auch
// nicht bei den „ein Chunk"-Typen mit sehr großem Inhalt.
describe("chunkContent — harte Größen-Obergrenze", () => {
  const HARD_MAX_CHARS = 8000;

  it("kappt riesige Einzel-Chunk-Typen (Charakter/Mission/Dialog)", () => {
    for (const type of ["character", "mission", "dialogue"] as const) {
      const record =
        type === "character"
          ? { name: "Riese", sourceMd: textOfTokens(9000) }
          : type === "mission"
            ? { title: "Riese", sourceMd: textOfTokens(9000) }
            : { title: "Riese", sourceMd: textOfTokens(9000) };
      const chunks = chunkContent({ type, record } as Parameters<typeof chunkContent>[0]);
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.text.length).toBeLessThanOrEqual(HARD_MAX_CHARS);
      }
    }
  });

  it("kappt auch ein einzelnes, nicht zerlegbares Riesen-Segment", () => {
    // Ein einziges „Wort" ohne Satz-/Absatzgrenzen (pathologisch).
    const chunks = chunkContent({
      type: "character",
      record: { name: "X", sourceMd: "a".repeat(50000) },
    });
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(HARD_MAX_CHARS);
    }
  });
});

describe("toVectorLiteral", () => {
  it("formatiert als pgvector-Literal", () => {
    expect(toVectorLiteral([0.1, 0.2, -0.3])).toBe("[0.1,0.2,-0.3]");
    expect(toVectorLiteral([])).toBe("[]");
  });
});
