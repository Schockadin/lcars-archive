import { describe, it, expect, vi } from "vitest";

// mentions.ts ist "server-only" und zieht die DB — für den reinen
// Wikilink-Parser wird beides gestubbt.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: () => Promise.resolve([]) }));

const { wikilinkTargets, wikilinkPointsTo } = await import("./mentions");

describe("wikilinkTargets", () => {
  it("liest einfache Wikilinks als Slug", () => {
    expect(wikilinkTargets("Siehe [[Tuvok]] dazu.")).toEqual(["Tuvok"]);
  });

  it("löst mehrere Links auf", () => {
    expect(wikilinkTargets("[[Tuvok]] traf [[Wirtin Sareth]].")).toEqual([
      "Tuvok",
      "Wirtin Sareth",
    ]);
  });

  it("ignoriert Alias und Abschnittsanker, nimmt das Ziel", () => {
    expect(wikilinkTargets("[[Wirtin Sareth|die Wirtin]]")).toEqual([
      "Wirtin Sareth",
    ]);
    expect(wikilinkTargets("[[Erste Mission#Verlauf]]")).toEqual([
      "Erste Mission",
    ]);
  });

  it("liefert nichts ohne Wikilinks", () => {
    expect(wikilinkTargets("Nur Fließtext mit Tuvok als Wort.")).toEqual([]);
    expect(wikilinkTargets("")).toEqual([]);
  });

  it("ist bei mehrfachem Aufruf stabil (lastIndex-Falle der globalen Regex)", () => {
    const md = "[[Tuvok]] und [[Barkeeper]]";
    expect(wikilinkTargets(md)).toEqual(["Tuvok", "Barkeeper"]);
    expect(wikilinkTargets(md)).toEqual(["Tuvok", "Barkeeper"]);
  });
});

describe("wikilinkPointsTo", () => {
  const log = { slug: "log-1", name: "Log Eins" };

  it("erkennt den Verweis über den TITEL, auch wenn der Slug abweicht", () => {
    // Genau der Fall, an dem eine reine Slug-Prüfung scheitert: der Renderer
    // löst [[Log Eins]] über den Titel auf, der Slug lautet aber „log-1".
    expect(wikilinkPointsTo("Siehe [[Log Eins]].", log)).toBe(true);
  });

  it("erkennt den Verweis auch über den Slug", () => {
    expect(wikilinkPointsTo("Siehe [[log-1]].", log)).toBe(true);
  });

  it("ist unempfindlich gegen Groß-/Kleinschreibung und Leerraum", () => {
    expect(wikilinkPointsTo("[[  log eins  ]]", log)).toBe(true);
  });

  it("zählt bloßes Namens-Vorkommen ohne Wikilink NICHT", () => {
    expect(wikilinkPointsTo("Im Log Eins stand nichts.", log)).toBe(false);
  });

  it("zählt einen Verweis auf etwas anderes nicht", () => {
    expect(wikilinkPointsTo("[[Tuvok]]", log)).toBe(false);
  });
});
