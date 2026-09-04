import { describe, it, expect } from "vitest";
import {
  escapeLikePattern,
  searchTerms,
  findSnippetMatch,
  buildSnippet,
} from "./search";

describe("escapeLikePattern", () => {
  it("maskiert Prozent, Unterstrich und Backslash", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });

  it("lässt gewöhnlichen Text unverändert", () => {
    expect(escapeLikePattern("Kirk")).toBe("Kirk");
    expect(escapeLikePattern("T'Lorexia")).toBe("T'Lorexia");
  });

  it("maskiert mehrere Sonderzeichen im selben String", () => {
    expect(escapeLikePattern("100%_done\\")).toBe("100\\%\\_done\\\\");
  });
});

describe("searchTerms", () => {
  it("zerlegt in Wörter und entfernt Operatoren", () => {
    expect(searchTerms("Tuvok Vulkan")).toEqual(["tuvok", "vulkan"]);
    expect(searchTerms('"Abend in der Kantine"')).toEqual([
      "abend",
      "in",
      "der",
      "kantine",
    ]);
    expect(searchTerms("Kantine -Quark")).toEqual(["kantine", "quark"]);
    expect(searchTerms("  ")).toEqual([]);
  });
});

describe("findSnippetMatch", () => {
  const text = "Ein ruhiger Abend in der Kantine, das Gespräch drehte sich um Quark.";

  it("findet die wörtliche Eingabe", () => {
    const hit = findSnippetMatch(text, "Kantine");
    expect(hit?.text).toBe("Kantine");
  });

  it("findet ein einzelnes Wort aus einer Mehrwort-Eingabe", () => {
    // Diese Reihenfolge steht so nicht im Text — der Volltextindex findet die
    // Zeile trotzdem, der Ausschnitt muss also über ein Einzelwort greifen.
    const hit = findSnippetMatch(text, "Kantine Abend");
    expect(hit).toBeDefined();
    expect(["Kantine", "Abend"]).toContain(hit?.text);
  });

  it("findet über die Wortform und zeigt das ganze Wort", () => {
    // Genau der Fall, den erst der Volltextindex findet: Plural gesucht,
    // Singular steht im Text.
    const hit = findSnippetMatch(text, "Gespräche");
    expect(hit?.text).toBe("Gespräch");
  });

  it("gibt undefined zurück, wenn nichts passt", () => {
    expect(findSnippetMatch(text, "Warpkern")).toBeUndefined();
  });

  it("greift nicht bei zu kurzen Stämmen", () => {
    // "der" ist kürzer als die Mindestlänge — kein Präfix-Treffer auf "dr…".
    expect(findSnippetMatch("Drehbuch", "der")).toBeUndefined();
  });
});

describe("buildSnippet mit Wortformen", () => {
  it("baut einen Ausschnitt auch bei einem Wortform-Treffer", () => {
    const s = buildSnippet(
      "Ein ruhiger Abend in der Kantine, das Gespräch drehte sich um Quark.",
      "Gespräche",
    );
    expect(s).toContain("Gespräch");
  });

  it("bleibt undefined ohne Treffer", () => {
    expect(buildSnippet("Nichts davon hier.", "Warpkern")).toBeUndefined();
  });
});
