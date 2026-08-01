// Geteilte Typen für den Story-Graph der Timeline (/timeline). Bewusst eine
// eigene, abhängigkeitsfreie Datei: die Client-Komponente (StoryGraph.tsx)
// importiert NUR diese Typen (per `import type`), während die Logik
// (storyGraphFormat.ts) WIKILINK_RE aus markdown.ts zieht — so landet die
// remark/unified-Kette nie im Client-Bundle.

export type StoryNodeType = "character" | "mission" | "archive";

export interface StoryNode {
  // Stabiler, typ-eindeutiger Knoten-Schlüssel: `${type}:${slug}`.
  id: string;
  type: StoryNodeType;
  slug: string;
  label: string;
  href: string;
  // Frühestes einem Knoten zugeordnetes Jahr (aus Timeline-Ereignissen,
  // Missions-Daten, Gespräch-logDate bzw. Charakter-Geburtsjahr — kombiniert).
  // Steuert die kumulative Sichtbarkeit: der Knoten erscheint, sobald der
  // Regler >= minYear steht. null = kein Jahr bekannt → im Jahr-Filter nie
  // sichtbar.
  minYear: number | null;
}

export interface StoryEdge {
  // Knoten-IDs (siehe StoryNode.id).
  source: string;
  target: string;
  label?: string;
}

export interface YearRange {
  min: number;
  max: number;
}

export interface StoryGraph {
  nodes: StoryNode[];
  edges: StoryEdge[];
  // null, wenn kein Knoten ein Jahr trägt (leerer Regler-Bereich).
  yearRange: YearRange | null;
}
