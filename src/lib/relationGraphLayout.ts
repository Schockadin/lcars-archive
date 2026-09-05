// Layout des Beziehungsgraphen — reine Geometrie, ohne DB und ohne React,
// damit sie sich testen lässt (der Datenzugriff liegt in relations.ts, die
// Darstellung in RelationGraph.tsx).
//
// Kreis-Layout statt Kräftesimulation: Eine Simulation bräuchte eine
// Bibliothek, liefe bei jedem Aufruf anders und wäre nicht prüfbar. Auf einem
// Kreis liegt jeder Knoten sichtbar am Rand, keiner verdeckt einen anderen,
// und das Ergebnis ist bei gleichen Daten immer dasselbe.
//
// Damit verbundene Figuren trotzdem beieinander landen, ordnet
// orderByBarycenter() sie vor: Jeder Knoten wandert zur mittleren Position
// seiner Nachbarn (bekanntes Barycenter-Heuristikverfahren aus dem
// Graphenzeichnen). Das ist kein Optimum, aber es bündelt zusammengehörige
// Gruppen und bleibt deterministisch.

export interface LayoutNode {
  slug: string;
  name: string;
  kind: "character" | "npc";
  href: string;
  // Summe aller Kantengewichte an diesem Knoten — steuert die Punktgröße.
  weight: number;
  x: number;
  y: number;
  // Winkel auf dem Kreis (rad), für die Ausrichtung der Beschriftung.
  angle: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  weight: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  radius: number;
}

export interface LayoutInput {
  nodes: { slug: string; name: string; kind: "character" | "npc"; href: string }[];
  edges: { source: string; target: string; sharedMissions: number; sharedDialogues: number }[];
}

// Wie oft die Barycenter-Vorsortierung läuft. Drei Durchgänge bündeln
// sichtbar; weitere ändern bei den Größenordnungen dieser Runde (ein paar
// Dutzend Figuren) praktisch nichts mehr.
export const BARYCENTER_PASSES = 3;

export function edgeWeight(edge: {
  sharedMissions: number;
  sharedDialogues: number;
}): number {
  return edge.sharedMissions + edge.sharedDialogues;
}

// Nachbarschaftsliste, Slug → Slugs. Reine Hilfsfunktion, exportiert für die
// Tests.
export function adjacencyOf(input: LayoutInput): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const node of input.nodes) out.set(node.slug, []);
  for (const edge of input.edges) {
    out.get(edge.source)?.push(edge.target);
    out.get(edge.target)?.push(edge.source);
  }
  return out;
}

// Sortiert die Knoten so um, dass verbundene nebeneinander landen: Jeder
// Knoten bekommt die mittlere aktuelle Position seiner Nachbarn zugewiesen
// und alles wird danach neu sortiert. Knoten ohne Nachbarn behalten ihre
// Position (sonst wanderten sie zufällig nach vorn).
//
// Bei Gleichstand entscheidet die bisherige Position — damit ist das Ergebnis
// bei gleicher Eingabe immer dasselbe.
export function orderByBarycenter(
  slugs: string[],
  adjacency: Map<string, string[]>,
  passes = BARYCENTER_PASSES,
): string[] {
  let order = [...slugs];
  for (let pass = 0; pass < passes; pass++) {
    const position = new Map(order.map((slug, index) => [slug, index]));
    const scored = order.map((slug, index) => {
      const neighbours = adjacency.get(slug) ?? [];
      const known = neighbours
        .map((n) => position.get(n))
        .filter((p): p is number => p !== undefined);
      const score =
        known.length === 0
          ? index
          : known.reduce((sum, p) => sum + p, 0) / known.length;
      return { slug, score, index };
    });
    scored.sort((a, b) => a.score - b.score || a.index - b.index);
    order = scored.map((s) => s.slug);
  }
  return order;
}

// Geschätzte Breite eines Namens in der Beschriftungsschrift (12px Monospace,
// siehe relation-graph.css). Grob, aber ausreichend: es geht nur darum, den
// Kreis so weit zu verkleinern, dass die längste Beschriftung noch auf die
// Zeichenfläche passt.
export const LABEL_CHAR_WIDTH = 7.2;

// Der Platz, den die Beschriftungen am Rand brauchen — aus dem LÄNGSTEN Namen
// abgeleitet. Mit festem Wert lief „Barkeeper Quark" am linken Rand aus dem
// Bild (die Beschriftung steht dort rechtsbündig nach außen).
export function paddingForLabels(
  names: string[],
  minimum = 110,
): number {
  const longest = names.reduce((max, n) => Math.max(max, n.length), 0);
  return Math.max(minimum, longest * LABEL_CHAR_WIDTH + 24);
}

// Berechnet das fertige Layout. size ist die Kantenlänge der quadratischen
// Zeichenfläche; padding hält den Platz für die Beschriftungen am Rand frei
// und ergibt sich standardmäßig aus dem längsten Namen.
export function layoutRelationGraph(
  input: LayoutInput,
  { size = 720, padding }: { size?: number; padding?: number } = {},
): GraphLayout {
  const effectivePadding =
    padding ?? paddingForLabels(input.nodes.map((n) => n.name));
  // Nie unter ein Viertel der Fläche: bei sehr langen Namen bliebe sonst kein
  // Kreis übrig, auf dem sich die Punkte noch unterscheiden ließen — dann
  // wird die Beschriftung lieber knapp.
  const radius = Math.max(size * 0.12, size / 2 - effectivePadding);
  const center = size / 2;

  const adjacency = adjacencyOf(input);
  const order = orderByBarycenter(
    input.nodes.map((n) => n.slug),
    adjacency,
  );

  const weightBySlug = new Map<string, number>(
    input.nodes.map((n) => [n.slug, 0]),
  );
  for (const edge of input.edges) {
    const w = edgeWeight(edge);
    weightBySlug.set(edge.source, (weightBySlug.get(edge.source) ?? 0) + w);
    weightBySlug.set(edge.target, (weightBySlug.get(edge.target) ?? 0) + w);
  }

  const bySlug = new Map(input.nodes.map((n) => [n.slug, n]));
  const count = order.length;
  const nodes: LayoutNode[] = order.map((slug, index) => {
    const node = bySlug.get(slug)!;
    // Bei -π/2 (oben) beginnen und im Uhrzeigersinn laufen — so liest sich
    // der Kreis wie ein Zifferblatt.
    const angle = count === 0 ? 0 : (index / count) * Math.PI * 2 - Math.PI / 2;
    return {
      ...node,
      weight: weightBySlug.get(slug) ?? 0,
      angle,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

  const positions = new Map(nodes.map((n) => [n.slug, n]));
  const edges: LayoutEdge[] = input.edges.flatMap((edge) => {
    const a = positions.get(edge.source);
    const b = positions.get(edge.target);
    // Kanten zu Knoten, die nicht in der Liste stehen, fallen weg statt NaN
    // zu zeichnen.
    if (!a || !b) return [];
    return [
      {
        source: edge.source,
        target: edge.target,
        weight: edgeWeight(edge),
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
      },
    ];
  });

  return { nodes, edges, width: size, height: size, radius };
}

// Punktradius aus dem Knotengewicht: wer viele Berührungspunkte hat, bekommt
// einen größeren Punkt. Gedeckelt, damit ein einzelner Vielverbundener den
// Graphen nicht dominiert.
export function nodeRadius(weight: number): number {
  return Math.min(14, 5 + Math.sqrt(Math.max(0, weight)) * 2);
}

// Strichstärke aus dem Kantengewicht, ebenfalls gedeckelt.
export function edgeWidth(weight: number): number {
  return Math.min(5, 1 + Math.max(0, weight - 1) * 0.6);
}
