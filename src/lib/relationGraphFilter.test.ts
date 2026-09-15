import { describe, it, expect } from "vitest";
import {
  DEFAULT_RELATION_FILTER,
  filterRelationGraph,
  isDefaultFilter,
  relationGraphList,
  type RelationGraphFilter,
} from "./relationGraphFilter";
import type { LayoutInput } from "./relationGraphLayout";

function character(slug: string) {
  return {
    slug,
    name: slug.toUpperCase(),
    kind: "character" as const,
    href: `/characters/${slug}`,
  };
}

function npc(slug: string) {
  return {
    slug,
    name: slug.toUpperCase(),
    kind: "npc" as const,
    href: `/archive/${slug}`,
  };
}

function edge(
  source: string,
  target: string,
  missions = 0,
  dialogues = 0,
  links = 0,
) {
  return {
    source,
    target,
    sharedMissions: missions,
    sharedDialogues: dialogues,
    sharedLinks: links,
  };
}

// a—b: 3 Missionen; b—c: 1 Gespräch; c—npc: 2 Verlinkungen.
const GRAPH: LayoutInput = {
  nodes: [character("a"), character("b"), character("c"), npc("quark")],
  edges: [
    edge("a", "b", 3),
    edge("b", "c", 0, 1),
    edge("c", "quark", 0, 0, 2),
  ],
};

function filter(patch: Partial<RelationGraphFilter> = {}): RelationGraphFilter {
  return { ...DEFAULT_RELATION_FILTER, ...patch };
}

describe("filterRelationGraph", () => {
  it("lässt den Graphen im Standard unverändert", () => {
    const result = filterRelationGraph(GRAPH, DEFAULT_RELATION_FILTER);
    expect(result.nodes.map((n) => n.slug)).toEqual([
      "a",
      "b",
      "c",
      "quark",
    ]);
    expect(result.edges).toHaveLength(3);
  });

  it("zählt abgeschaltete Quellen nicht mehr mit", () => {
    const result = filterRelationGraph(GRAPH, filter({ dialogues: false }));
    expect(result.edges.map((e) => [e.source, e.target])).toEqual([
      ["a", "b"],
      ["c", "quark"],
    ]);
    // Ohne die Gesprächs-Kante hängt b nur noch an a.
    expect(result.nodes.map((n) => n.slug)).toEqual(["a", "b", "c", "quark"]);
  });

  it("wirft Knoten weg, die ohne ihre Kanten allein dastehen", () => {
    const result = filterRelationGraph(
      GRAPH,
      filter({ dialogues: false, links: false }),
    );
    expect(result.nodes.map((n) => n.slug)).toEqual(["a", "b"]);
    expect(result.edges).toHaveLength(1);
  });

  it("blendet NPCs samt ihrer Verbindungen aus", () => {
    const result = filterRelationGraph(GRAPH, filter({ npcs: false }));
    expect(result.nodes.map((n) => n.slug)).toEqual(["a", "b", "c"]);
    expect(result.edges).toHaveLength(2);
  });

  it("lässt nur Verbindungen ab der Mindeststärke übrig", () => {
    const result = filterRelationGraph(GRAPH, filter({ minWeight: 2 }));
    expect(result.edges.map((e) => [e.source, e.target])).toEqual([
      ["a", "b"],
      ["c", "quark"],
    ]);
  });

  it("zeigt im Fokus nur die Figur und ihre direkten Verbindungen", () => {
    const result = filterRelationGraph(GRAPH, filter({ focus: "c" }));
    expect(result.nodes.map((n) => n.slug)).toEqual(["b", "c", "quark"]);
    expect(result.edges).toHaveLength(2);
  });

  it("behält die Fokus-Figur, auch wenn ihr nichts bleibt", () => {
    const result = filterRelationGraph(
      GRAPH,
      filter({ focus: "a", missions: false }),
    );
    expect(result.nodes.map((n) => n.slug)).toEqual(["a"]);
    expect(result.edges).toHaveLength(0);
  });
});

describe("isDefaultFilter", () => {
  it("erkennt den vollen Blick", () => {
    expect(isDefaultFilter(DEFAULT_RELATION_FILTER)).toBe(true);
  });

  it("erkennt jede Einschränkung", () => {
    expect(isDefaultFilter(filter({ npcs: false }))).toBe(false);
    expect(isDefaultFilter(filter({ minWeight: 2 }))).toBe(false);
    expect(isDefaultFilter(filter({ focus: "a" }))).toBe(false);
  });
});

describe("relationGraphList", () => {
  it("führt je Figur ihre Partner, stärkste zuerst", () => {
    const list = relationGraphList(GRAPH);

    // b hängt an zwei Kanten (3 + 1) und steht deshalb vor a (3).
    expect(list.map((e) => e.slug)).toEqual(["b", "a", "c", "quark"]);
    expect(list[0].weight).toBe(4);
    expect(list.find((e) => e.slug === "c")?.partners.map((p) => p.slug)).toEqual(
      ["quark", "b"],
    );
  });

  it("kennt nur die Figuren des übergebenen (gefilterten) Graphen", () => {
    const list = relationGraphList(
      filterRelationGraph(GRAPH, filter({ npcs: false })),
    );
    expect(list.map((e) => e.slug)).not.toContain("quark");
  });
});
