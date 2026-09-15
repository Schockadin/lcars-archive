import type { LayoutInput } from "@/lib/relationGraphLayout";
import { edgeWeight } from "@/lib/relationGraphLayout";

// Filter für den Beziehungsgraphen — reine Datenarbeit, ohne React, damit sie
// prüfbar bleibt (die Bedienelemente stehen in RelationGraph.tsx).
//
// Warum überhaupt: Mit ein paar Dutzend Figuren und ihren Verbindungen ist
// ein Gesamtgraph ein Wollknäuel. Vor der Wahl zwischen „andere Zeichenart"
// (Kräftesimulation, Matrix, Cluster) und „weniger auf einmal zeigen" fiel
// die Entscheidung auf Letzteres: Die Unübersichtlichkeit kommt aus der
// MENGE, nicht aus der Kreisform — ein Kräftelayout mit denselben 40 Figuren
// wäre genauso voll, bräuchte aber eine Bibliothek, liefe bei jedem Aufruf
// anders und ließe sich nicht prüfen (siehe Kopfkommentar in
// relationGraphLayout.ts). Vier Griffe reichen, um aus dem Knäuel eine
// Aussage zu machen:
//
//   • Quellen: Missionen, Gespräche und Verlinkungen einzeln zuschaltbar —
//     „wer war mit wem im Einsatz" ist eine andere Frage als „wer redet mit
//     wem".
//   • NPCs: die Spielfiguren allein sind oft schon die gesuchte Antwort.
//   • Mindeststärke: nur Verbindungen ab N Berührungspunkten — eine einzelne
//     gemeinsame Erwähnung sagt weniger als zehn gemeinsame Missionen.
//   • Fokus: eine Figur und ihre direkten Verbindungen statt aller.
//
// Alles läuft im Browser auf dem schon geladenen Graphen: kein zusätzlicher
// Server-Weg, und ohne JavaScript bleibt der volle Graph stehen.

export interface RelationGraphFilter {
  // Welche der drei Quellen zählen (siehe relations.ts).
  missions: boolean;
  dialogues: boolean;
  links: boolean;
  // NPCs (Datenbank-Einträge) mitzeigen?
  npcs: boolean;
  // Mindestzahl an Berührungspunkten je Verbindung.
  minWeight: number;
  // Slug der Figur, auf die eingegrenzt wird — null zeigt alle.
  focus: string | null;
}

export const DEFAULT_RELATION_FILTER: RelationGraphFilter = {
  missions: true,
  dialogues: true,
  links: true,
  npcs: true,
  minWeight: 1,
  focus: null,
};

// Ist das der volle, ungefilterte Blick? Dann braucht es keinen Hinweis auf
// eine Einschränkung.
export function isDefaultFilter(filter: RelationGraphFilter): boolean {
  return (
    filter.missions &&
    filter.dialogues &&
    filter.links &&
    filter.npcs &&
    filter.minWeight <= 1 &&
    filter.focus === null
  );
}

// Eine Verbindung mit den abgeschalteten Quellen auf 0 gesetzt — so bleibt
// der Kantentyp erhalten (Strichstärke, Gewicht), es zählt nur noch, was
// gefragt ist.
function applySources(
  edge: LayoutInput["edges"][number],
  filter: RelationGraphFilter,
): LayoutInput["edges"][number] {
  return {
    ...edge,
    sharedMissions: filter.missions ? edge.sharedMissions : 0,
    sharedDialogues: filter.dialogues ? edge.sharedDialogues : 0,
    sharedLinks: filter.links ? edge.sharedLinks : 0,
  };
}

// Wendet alle Griffe der Reihe nach an. Knoten ohne verbleibende Verbindung
// fallen weg — dieselbe Regel wie serverseitig in getRelationGraph(): ein
// einzelner Punkt ohne Linie sagt im Beziehungsgraph nichts aus. Die
// Fokus-Figur bleibt allerdings stehen, auch wenn von ihr nichts übrig
// bleibt: sonst verschwände gerade das, wonach gefragt wurde.
export function filterRelationGraph(
  input: LayoutInput,
  filter: RelationGraphFilter,
): LayoutInput {
  const kindBySlug = new Map(input.nodes.map((n) => [n.slug, n.kind]));
  const allowed = (slug: string) =>
    filter.npcs || kindBySlug.get(slug) === "character";

  const minWeight = Math.max(1, filter.minWeight);

  const edges = input.edges
    .map((edge) => applySources(edge, filter))
    .filter(
      (edge) =>
        edgeWeight(edge) >= minWeight &&
        allowed(edge.source) &&
        allowed(edge.target) &&
        (filter.focus === null ||
          edge.source === filter.focus ||
          edge.target === filter.focus),
    );

  const connected = new Set<string>();
  for (const edge of edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  if (filter.focus !== null && allowed(filter.focus)) {
    connected.add(filter.focus);
  }

  return {
    nodes: input.nodes.filter((n) => connected.has(n.slug)),
    edges,
  };
}

export interface RelationPartner {
  slug: string;
  name: string;
  kind: "character" | "npc";
  href: string;
  weight: number;
}

export interface RelationListEntry {
  slug: string;
  name: string;
  kind: "character" | "npc";
  href: string;
  weight: number;
  partners: RelationPartner[];
}

// Derselbe (gefilterte) Graph als Liste: je Figur ihre Verbindungen,
// absteigend nach Berührungspunkten. Das ist die zweite Lesart derselben
// Daten — für Screenreader, für schmale Bildschirme und für alle, die eine
// Rangfolge lieber lesen als aus Punktgrößen ableiten.
export function relationGraphList(input: LayoutInput): RelationListEntry[] {
  const bySlug = new Map(input.nodes.map((n) => [n.slug, n]));
  const partners = new Map<string, RelationPartner[]>(
    input.nodes.map((n) => [n.slug, []]),
  );

  for (const edge of input.edges) {
    const weight = edgeWeight(edge);
    for (const [from, to] of [
      [edge.source, edge.target],
      [edge.target, edge.source],
    ] as const) {
      const other = bySlug.get(to);
      if (!other || !partners.has(from)) continue;
      partners.get(from)!.push({ ...other, weight });
    }
  }

  return input.nodes
    .map((node) => {
      const list = (partners.get(node.slug) ?? []).sort(
        (a, b) => b.weight - a.weight || a.name.localeCompare(b.name, "de"),
      );
      return {
        ...node,
        weight: list.reduce((sum, p) => sum + p.weight, 0),
        partners: list,
      };
    })
    .sort(
      (a, b) => b.weight - a.weight || a.name.localeCompare(b.name, "de"),
    );
}
