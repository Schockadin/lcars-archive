import { describe, it, expect } from "vitest";
import {
  yearFromIso,
  computeYearRange,
  buildStoryEdges,
  type EdgeLookupEntry,
} from "./storyGraphFormat";
import type { StoryEdge } from "@/types/storyGraph";

describe("yearFromIso", () => {
  it("liest das Jahr aus einem ISO-Datum", () => {
    expect(yearFromIso("2401-05-12")).toBe(2401);
    expect(yearFromIso("2400")).toBe(2400);
  });
  it("liefert null bei fehlend/ungültig", () => {
    expect(yearFromIso(null)).toBeNull();
    expect(yearFromIso("")).toBeNull();
    expect(yearFromIso("kein-jahr")).toBeNull();
  });
});

describe("computeYearRange", () => {
  it("liefert min/max über alle Jahre", () => {
    expect(computeYearRange([2405, 2400, 2402])).toEqual({ min: 2400, max: 2405 });
  });
  it("liefert null bei leerer Liste", () => {
    expect(computeYearRange([])).toBeNull();
  });
  it("ignoriert nicht-endliche Werte", () => {
    expect(computeYearRange([NaN, 2401, Infinity])).toEqual({ min: 2401, max: 2401 });
  });
});

const LOOKUP: EdgeLookupEntry[] = [
  { id: "character:kirk", slug: "kirk", titles: ["James Kirk", "Kirk"] },
  { id: "mission:erstkontakt", slug: "erstkontakt", titles: ["Erstkontakt"] },
  { id: "archive:ds9", slug: "ds9", titles: ["Deep Space 9"] },
];

describe("buildStoryEdges", () => {
  it("löst Wikilinks per Titel und Alias zu Kanten auf", () => {
    const md = new Map<string, string | null>([
      ["mission:erstkontakt", "Geleitet von [[James Kirk]] auf [[Deep Space 9]]."],
    ]);
    const edges = buildStoryEdges(LOOKUP, md);
    expect(edges).toEqual([
      { source: "mission:erstkontakt", target: "character:kirk" },
      { source: "mission:erstkontakt", target: "archive:ds9" },
    ]);
  });

  it("löst per Slug auf, wenn der Titel nicht matcht (z.B. [[kirk]])", () => {
    const md = new Map<string, string | null>([
      ["archive:ds9", "Siehe [[kirk]]."],
    ]);
    const edges = buildStoryEdges(LOOKUP, md);
    expect(edges).toEqual([{ source: "archive:ds9", target: "character:kirk" }]);
  });

  it("dedupliziert und ignoriert Selbstkanten", () => {
    const md = new Map<string, string | null>([
      ["character:kirk", "[[Kirk]] trifft [[Deep Space 9]], nochmal [[Deep Space 9]]."],
    ]);
    const edges = buildStoryEdges(LOOKUP, md);
    // Selbstlink [[Kirk]] raus, [[Deep Space 9]] nur einmal.
    expect(edges).toEqual([{ source: "character:kirk", target: "archive:ds9" }]);
  });

  it("übernimmt extraEdges nur zwischen existierenden Knoten", () => {
    const extra: StoryEdge[] = [
      { source: "archive:ds9", target: "character:kirk", label: "erwähnt" },
      { source: "archive:ds9", target: "archive:fehlt" }, // Ziel existiert nicht
    ];
    const edges = buildStoryEdges(LOOKUP, new Map(), extra);
    expect(edges).toEqual([
      { source: "archive:ds9", target: "character:kirk", label: "erwähnt" },
    ]);
  });

  it("ignoriert Knoten ohne source_md", () => {
    expect(buildStoryEdges(LOOKUP, new Map())).toEqual([]);
  });
});
