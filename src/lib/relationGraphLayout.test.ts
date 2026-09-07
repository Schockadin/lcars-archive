import { describe, it, expect } from "vitest";
import {
  adjacencyOf,
  paddingForLabels,
  edgeWeight,
  edgeWidth,
  layoutRelationGraph,
  nodeRadius,
  orderByBarycenter,
  type LayoutInput,
} from "./relationGraphLayout";

function node(slug: string) {
  return {
    slug,
    name: slug.toUpperCase(),
    kind: "character" as const,
    href: `/characters/${slug}`,
  };
}

function edge(source: string, target: string, missions = 1, dialogues = 0) {
  return { source, target, sharedMissions: missions, sharedDialogues: dialogues };
}

describe("edgeWeight", () => {
  it("zählt Missionen und Gespräche zusammen", () => {
    expect(edgeWeight({ sharedMissions: 2, sharedDialogues: 3 })).toBe(5);
  });
});

describe("adjacencyOf", () => {
  it("führt jede Kante auf BEIDEN Seiten (der Graph ist ungerichtet)", () => {
    const input: LayoutInput = {
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("a", "b")],
    };
    const adjacency = adjacencyOf(input);
    expect(adjacency.get("a")).toEqual(["b"]);
    expect(adjacency.get("b")).toEqual(["a"]);
    expect(adjacency.get("c")).toEqual([]);
  });
});

describe("orderByBarycenter", () => {
  const adjacency = (pairs: [string, string][], slugs: string[]) =>
    adjacencyOf({
      nodes: slugs.map(node),
      edges: pairs.map(([a, b]) => edge(a, b)),
    });

  it("rückt verbundene Knoten zusammen", () => {
    // Zwei Dreiergruppen, im Ausgangszustand ineinander verschränkt.
    const slugs = ["a1", "b1", "a2", "b2", "a3", "b3"];
    const order = orderByBarycenter(
      slugs,
      adjacency(
        [
          ["a1", "a2"],
          ["a2", "a3"],
          ["a1", "a3"],
          ["b1", "b2"],
          ["b2", "b3"],
          ["b1", "b3"],
        ],
        slugs,
      ),
    );
    // Jede Gruppe steht danach zusammenhängend — geprüft über den Abstand
    // zwischen erstem und letztem Mitglied.
    const spread = (prefix: string) => {
      const idx = order
        .map((s, i) => (s.startsWith(prefix) ? i : -1))
        .filter((i) => i >= 0);
      return Math.max(...idx) - Math.min(...idx);
    };
    expect(spread("a")).toBe(2);
    expect(spread("b")).toBe(2);
  });

  it("ist deterministisch — gleiche Eingabe, gleiche Ausgabe", () => {
    const slugs = ["a", "b", "c", "d"];
    const adj = adjacency(
      [
        ["a", "c"],
        ["b", "d"],
      ],
      slugs,
    );
    expect(orderByBarycenter(slugs, adj)).toEqual(orderByBarycenter(slugs, adj));
  });

  it("behält Knoten ohne Nachbarn an ihrer Stelle", () => {
    const slugs = ["allein", "a", "b"];
    const order = orderByBarycenter(
      slugs,
      adjacency([["a", "b"]], slugs),
      1,
    );
    expect(order).toContain("allein");
    expect(order).toHaveLength(3);
  });

  it("kommt mit einer leeren Liste zurecht", () => {
    expect(orderByBarycenter([], new Map())).toEqual([]);
  });
});

describe("layoutRelationGraph", () => {
  const input: LayoutInput = {
    nodes: [node("a"), node("b"), node("c")],
    edges: [edge("a", "b", 2), edge("b", "c", 1, 2)],
  };

  it("legt jeden Knoten auf den Kreis um die Mitte", () => {
    const layout = layoutRelationGraph(input, { size: 400, padding: 100 });
    expect(layout.radius).toBe(100);
    for (const n of layout.nodes) {
      const dx = n.x - 200;
      const dy = n.y - 200;
      expect(Math.hypot(dx, dy)).toBeCloseTo(100, 6);
    }
  });

  it("summiert das Gewicht je Knoten aus seinen Kanten", () => {
    const layout = layoutRelationGraph(input);
    const weight = (slug: string) =>
      layout.nodes.find((n) => n.slug === slug)?.weight;
    expect(weight("a")).toBe(2); // nur a–b
    expect(weight("b")).toBe(5); // a–b (2) + b–c (3)
    expect(weight("c")).toBe(3);
  });

  it("verbindet die Kanten mit den Punkten ihrer Enden", () => {
    const layout = layoutRelationGraph(input);
    const a = layout.nodes.find((n) => n.slug === "a")!;
    const ab = layout.edges.find(
      (e) => e.source === "a" && e.target === "b",
    )!;
    expect(ab.x1).toBeCloseTo(a.x, 6);
    expect(ab.y1).toBeCloseTo(a.y, 6);
    expect(ab.weight).toBe(2);
  });

  // Eine Kante auf einen Knoten, den es nicht (mehr) gibt, würde sonst als
  // NaN-Linie im SVG landen.
  it("lässt Kanten ins Leere weg statt NaN zu zeichnen", () => {
    const layout = layoutRelationGraph({
      nodes: [node("a")],
      edges: [edge("a", "weg")],
    });
    expect(layout.edges).toHaveLength(0);
  });

  it("kommt mit einem leeren Graphen zurecht", () => {
    const layout = layoutRelationGraph({ nodes: [], edges: [] });
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
  });

  it("verteilt die Knoten gleichmäßig und beginnt oben", () => {
    const layout = layoutRelationGraph(
      { nodes: [node("a"), node("b"), node("c"), node("d")], edges: [] },
      { size: 400, padding: 100 },
    );
    // Der erste Knoten sitzt bei -π/2, also senkrecht über der Mitte.
    expect(layout.nodes[0].y).toBeCloseTo(100, 6);
    expect(layout.nodes[0].x).toBeCloseTo(200, 6);
    const step = layout.nodes[1].angle - layout.nodes[0].angle;
    expect(step).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe("nodeRadius / edgeWidth", () => {
  it("wachsen mit dem Gewicht, aber gedeckelt", () => {
    expect(nodeRadius(0)).toBe(5);
    expect(nodeRadius(4)).toBe(9);
    expect(nodeRadius(10_000)).toBe(14);
    expect(edgeWidth(1)).toBe(1);
    expect(edgeWidth(10_000)).toBe(5);
  });

  it("behandelt negative Werte wie 0 statt NaN zu liefern", () => {
    expect(nodeRadius(-5)).toBe(5);
    expect(edgeWidth(-5)).toBe(1);
  });
});

describe("paddingForLabels", () => {
  // Mit festem Rand lief „Barkeeper Quark" am linken Kreisrand aus dem Bild —
  // die Beschriftung steht dort rechtsbündig nach außen.
  it("wächst mit dem längsten Namen", () => {
    expect(paddingForLabels(["Ka"])).toBe(110);
    const long = paddingForLabels(["Barkeeper Quark aus Quarks Bar"]);
    expect(long).toBeGreaterThan(110);
  });

  it("hält den Mindestrand ein, auch ohne Namen", () => {
    expect(paddingForLabels([])).toBe(110);
  });

  it("lässt auch bei sehr langen Namen einen Kreis übrig", () => {
    const layout = layoutRelationGraph(
      {
        nodes: [
          { ...node("a"), name: "x".repeat(200) },
          { ...node("b"), name: "y".repeat(200) },
        ],
        edges: [],
      },
      { size: 400 },
    );
    expect(layout.radius).toBeGreaterThan(0);
    expect(layout.nodes[0].x).not.toBeNaN();
  });
});
