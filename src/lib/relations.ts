import "server-only";
import sql from "@/lib/db";
import { canView, type Viewer, type Visibility } from "@/lib/visibility";

// „Wer kennt wen" — Beziehungen einer Figur, abgeleitet aus dem, was ohnehin
// schon erfasst ist. Es gibt keine eigene Beziehungstabelle und dieses Modul
// legt auch keine an: Verbindungen entstehen im Spiel, nicht in einem
// Formular. Zwei Quellen, die genau das abbilden:
//
//   1. Gemeinsame Missionen (mission_participants) — wer war zusammen im
//      Einsatz.
//   2. Gemeinsame Gespräche (archive_entries der Kategorie „dialogue",
//      metadata.participants) — wer hat miteinander geredet. Teilnehmer
//      können Charaktere ODER Archiv-NPCs sein (kind im JSON), beide werden
//      übernommen und passend verlinkt.
//
// Sortiert nach Anzahl der Berührungspunkte: wer oft zusammen unterwegs war,
// steht oben. Sichtbarkeit wird wie sonst im Projekt in JS über canView()
// gefiltert.

export interface Relation {
  slug: string;
  name: string;
  // "character" → eigene Charakterseite, "npc" → Archiv-Eintrag.
  kind: "character" | "npc";
  href: string;
  sharedMissions: number;
  sharedDialogues: number;
}

interface DialogueRow {
  visibility: Visibility;
  owner_user_id: number | null;
  participants: { kind?: string; name?: string; slug?: string }[] | null;
}

// Zählt die Berührungspunkte zusammen — Grundlage der Sortierung.
export function relationWeight(r: Relation): number {
  return r.sharedMissions + r.sharedDialogues;
}

// Baut aus den Gesprächszeilen die Mitteilnehmer-Zählung auf. Ausgelagert und
// exportiert, damit die (fehleranfällige) JSON-Auswertung testbar ist, ohne
// eine Datenbank zu brauchen.
export function countDialoguePartners(
  rows: { participants: DialogueRow["participants"] }[],
  ownSlug: string,
): Map<string, { name: string; kind: "character" | "npc"; count: number }> {
  const out = new Map<
    string,
    { name: string; kind: "character" | "npc"; count: number }
  >();
  for (const row of rows) {
    const parts = row.participants ?? [];
    // Nur Gespräche zählen, an denen die Figur selbst beteiligt ist.
    if (!parts.some((p) => p?.slug === ownSlug)) continue;
    for (const p of parts) {
      if (!p?.slug || p.slug === ownSlug) continue;
      const kind = p.kind === "character" ? "character" : "npc";
      const prev = out.get(p.slug);
      if (prev) prev.count += 1;
      else out.set(p.slug, { name: p.name ?? p.slug, kind, count: 1 });
    }
  }
  return out;
}

export async function getRelationsOf(
  characterSlug: string,
  viewer: Viewer | null,
): Promise<Relation[]> {
  const [missionRows, dialogueRows] = await Promise.all([
    // Gemeinsame Missionen: über mission_participants auf sich selbst
    // zurückgejoint. Nur öffentliche, nicht gelöschte Charaktere.
    sql<{ slug: string; name: string; shared: number }[]>`
      SELECT other.slug, other.name, COUNT(*)::int AS shared
      FROM characters me
      JOIN mission_participants mine ON mine.character_id = me.id
      JOIN mission_participants theirs ON theirs.mission_id = mine.mission_id
                                      AND theirs.character_id <> me.id
      JOIN characters other ON other.id = theirs.character_id
      JOIN missions m ON m.id = mine.mission_id
      WHERE me.slug = ${characterSlug}
        AND other.deleted_at IS NULL AND other.is_draft = false
        AND other.visibility = 'public'
        AND m.deleted_at IS NULL AND m.is_draft = false
      GROUP BY other.slug, other.name
    `,
    sql<DialogueRow[]>`
      SELECT visibility, owner_user_id, metadata->'participants' AS participants
      FROM archive_entries
      WHERE category = 'dialogue'
        AND deleted_at IS NULL AND is_draft = false
        AND metadata->'participants' @> ${sql.json([
          { slug: characterSlug },
        ] as unknown as ReturnType<typeof JSON.parse>)}
    `,
  ]);

  const visibleDialogues = dialogueRows.filter((r) =>
    canView(r.visibility, r.owner_user_id, viewer),
  );
  const partners = countDialoguePartners(visibleDialogues, characterSlug);

  const bySlug = new Map<string, Relation>();
  for (const row of missionRows) {
    bySlug.set(row.slug, {
      slug: row.slug,
      name: row.name,
      kind: "character",
      href: `/characters/${row.slug}`,
      sharedMissions: row.shared,
      sharedDialogues: 0,
    });
  }
  for (const [slug, info] of partners) {
    const existing = bySlug.get(slug);
    if (existing) {
      existing.sharedDialogues += info.count;
      continue;
    }
    bySlug.set(slug, {
      slug,
      name: info.name,
      kind: info.kind,
      href:
        info.kind === "character" ? `/characters/${slug}` : `/archive/${slug}`,
      sharedMissions: 0,
      sharedDialogues: info.count,
    });
  }

  return [...bySlug.values()].sort(
    (a, b) => relationWeight(b) - relationWeight(a) || a.name.localeCompare(b.name),
  );
}


// ── Beziehungsgraph der ganzen Kampagne ────────────────────────────────
// Dieselben zwei Quellen wie oben, nur nicht von einer Figur aus, sondern für
// alle auf einmal: Knoten sind Figuren und NPCs, Kanten ihre Berührungspunkte.
// Bewusst EINE Abfrage je Quelle statt getRelationsOf() je Figur — bei 30
// Figuren wären das 60 Abfragen für dasselbe Ergebnis.

export interface GraphNode {
  slug: string;
  name: string;
  kind: "character" | "npc";
  href: string;
}

export interface GraphEdge {
  // Slugs der beiden Enden, immer alphabetisch sortiert — so gibt es je Paar
  // genau eine Kante, egal in welcher Reihenfolge die Quellen sie liefern.
  source: string;
  target: string;
  sharedMissions: number;
  sharedDialogues: number;
}

export interface RelationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Kanten-Schlüssel: sortiertes Paar. Exportiert, weil die Zusammenführung der
// beiden Quellen daran hängt und genau das getestet wird.
export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Baut aus den Gesprächszeilen alle Paare von Mitteilnehmenden auf. Wie
// countDialoguePartners ausgelagert und exportiert, damit die JSON-Auswertung
// ohne Datenbank testbar ist.
export function collectDialogueEdges(
  rows: { participants: DialogueRow["participants"] }[],
): {
  nodes: Map<string, GraphNode>;
  pairs: Map<string, number>;
} {
  const nodes = new Map<string, GraphNode>();
  const pairs = new Map<string, number>();

  for (const row of rows) {
    const parts = (row.participants ?? []).filter(
      (p): p is { kind?: string; name?: string; slug: string } =>
        typeof p?.slug === "string" && p.slug.length > 0,
    );
    // Doppelte Slugs innerhalb eines Gesprächs würden ein Paar mit sich
    // selbst und eine doppelte Zählung ergeben.
    const seen = new Set<string>();
    const unique = parts.filter((p) => !seen.has(p.slug) && seen.add(p.slug));

    for (const p of unique) {
      if (!nodes.has(p.slug)) {
        const kind = p.kind === "character" ? "character" : "npc";
        nodes.set(p.slug, {
          slug: p.slug,
          name: p.name ?? p.slug,
          kind,
          href:
            kind === "character" ? `/characters/${p.slug}` : `/archive/${p.slug}`,
        });
      }
    }
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = edgeKey(unique[i].slug, unique[j].slug);
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }

  return { nodes, pairs };
}

export async function getRelationGraph(
  viewer: Viewer | null,
): Promise<RelationGraph> {
  const [missionRows, dialogueRows] = await Promise.all([
    // Jedes Paar nur EINMAL: a.character_id < b.character_id statt <>, sonst
    // käme jede Kante doppelt zurück.
    sql<{
      aSlug: string;
      aName: string;
      bSlug: string;
      bName: string;
      shared: number;
    }[]>`
      SELECT ca.slug AS "aSlug", ca.name AS "aName",
             cb.slug AS "bSlug", cb.name AS "bName",
             COUNT(*)::int AS shared
      FROM mission_participants pa
      JOIN mission_participants pb ON pb.mission_id = pa.mission_id
                                  AND pb.character_id > pa.character_id
      JOIN characters ca ON ca.id = pa.character_id
      JOIN characters cb ON cb.id = pb.character_id
      JOIN missions m ON m.id = pa.mission_id
      WHERE ca.deleted_at IS NULL AND ca.is_draft = false AND ca.visibility = 'public'
        AND cb.deleted_at IS NULL AND cb.is_draft = false AND cb.visibility = 'public'
        AND m.deleted_at IS NULL AND m.is_draft = false
      GROUP BY ca.slug, ca.name, cb.slug, cb.name
    `,
    sql<DialogueRow[]>`
      SELECT visibility, owner_user_id, metadata->'participants' AS participants
      FROM archive_entries
      WHERE category = 'dialogue'
        AND deleted_at IS NULL AND is_draft = false
    `,
  ]);

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const putEdge = (a: string, b: string, patch: Partial<GraphEdge>) => {
    const key = edgeKey(a, b);
    const [source, target] = key.split("|");
    const existing = edges.get(key) ?? {
      source,
      target,
      sharedMissions: 0,
      sharedDialogues: 0,
    };
    edges.set(key, {
      ...existing,
      sharedMissions: existing.sharedMissions + (patch.sharedMissions ?? 0),
      sharedDialogues: existing.sharedDialogues + (patch.sharedDialogues ?? 0),
    });
  };

  for (const row of missionRows) {
    for (const [slug, name] of [
      [row.aSlug, row.aName],
      [row.bSlug, row.bName],
    ] as const) {
      if (!nodes.has(slug)) {
        nodes.set(slug, {
          slug,
          name,
          kind: "character",
          href: `/characters/${slug}`,
        });
      }
    }
    putEdge(row.aSlug, row.bSlug, { sharedMissions: row.shared });
  }

  const visibleDialogues = dialogueRows.filter((r) =>
    canView(r.visibility, r.owner_user_id, viewer),
  );
  const fromDialogues = collectDialogueEdges(visibleDialogues);
  for (const [slug, node] of fromDialogues.nodes) {
    // Ein bereits aus den Missionen bekannter Charakter behält seinen Namen
    // aus der Tabelle — der im Gesprächs-JSON kann veraltet sein.
    if (!nodes.has(slug)) nodes.set(slug, node);
  }
  for (const [key, count] of fromDialogues.pairs) {
    const [a, b] = key.split("|");
    putEdge(a, b, { sharedDialogues: count });
  }

  // Knoten ohne jede Kante fliegen raus: ein einzelner Punkt ohne Verbindung
  // sagt im Beziehungsgraph nichts aus und macht ihn nur voller.
  const connected = new Set<string>();
  for (const edge of edges.values()) {
    connected.add(edge.source);
    connected.add(edge.target);
  }

  return {
    nodes: [...nodes.values()]
      .filter((n) => connected.has(n.slug))
      .sort((a, b) => a.name.localeCompare(b.name, "de")),
    edges: [...edges.values()],
  };
}
