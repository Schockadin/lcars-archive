import "server-only";
import sql from "@/lib/db";
import { canView, type Viewer, type Visibility } from "@/lib/visibility";
import { normalizeWikilinkTarget } from "@/lib/autolink";
import { wikilinkTargets } from "@/lib/mentions";
import { slugifyBase } from "@/lib/slug";
import {
  archiveHref,
  characterHref,
} from "@/lib/contentRoutes";

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
//   3. Verlinkungen zwischen Charakteren und NPCs — wer verweist auf wen.
//      Quelle sind die [[Wikilinks]] im Fließtext (source_md) von Charakteren
//      und NPC-Einträgen, die strukturierten Verweisfelder eines NPC-Eintrags
//      auf Charaktere (metadata.characters) und die Verweise zwischen zwei
//      NPC-Einträgen (archive_links). Wer im Text eines anderen auftaucht,
//      hat mit ihm zu tun — auch ohne je zusammen im Einsatz gewesen zu sein.
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
  // Verweise zwischen den beiden — in beide Richtungen gezählt: verlinken
  // sich zwei Figuren gegenseitig, sind das zwei Berührungspunkte.
  sharedLinks: number;
}

interface DialogueRow {
  visibility: Visibility;
  owner_user_id: number | null;
  participants: { kind?: string; name?: string; slug?: string }[] | null;
}

// Zählt die Berührungspunkte zusammen — Grundlage der Sortierung.
export function relationWeight(r: Relation): number {
  return r.sharedMissions + r.sharedDialogues + r.sharedLinks;
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
  const [missionRows, dialogueRows, links] = await Promise.all([
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
    loadLinks(viewer),
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
      href: characterHref(row.slug),
      sharedMissions: row.shared,
      sharedDialogues: 0,
      sharedLinks: 0,
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
        info.kind === "character" ? characterHref(slug) : archiveHref(slug),
      sharedMissions: 0,
      sharedDialogues: info.count,
      sharedLinks: 0,
    });
  }

  // Verlinkungen: aus den Paaren der ganzen Kampagne nur die, an denen diese
  // Figur hängt. Name, Art und Adresse kommen dabei aus den geladenen Knoten
  // (Charaktere/NPC-Einträge) — der Partner muss also sichtbar sein.
  for (const [key, count] of links.pairs) {
    const [a, b] = key.split("|");
    if (a !== characterSlug && b !== characterSlug) continue;
    const partnerSlug = a === characterSlug ? b : a;
    const existing = bySlug.get(partnerSlug);
    if (existing) {
      existing.sharedLinks += count;
      continue;
    }
    const node = links.nodes.get(partnerSlug);
    if (!node) continue;
    bySlug.set(partnerSlug, {
      slug: node.slug,
      name: node.name,
      kind: node.kind,
      href: node.href,
      sharedMissions: 0,
      sharedDialogues: 0,
      sharedLinks: count,
    });
  }

  return [...bySlug.values()].sort(
    (a, b) => relationWeight(b) - relationWeight(a) || a.name.localeCompare(b.name),
  );
}


// ── Beziehungsgraph der ganzen Kampagne ────────────────────────────────
// Dieselben drei Quellen wie oben, nur nicht von einer Figur aus, sondern für
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
  sharedLinks: number;
}

export interface RelationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Kanten-Schlüssel: sortiertes Paar. Exportiert, weil die Zusammenführung
// aller Quellen daran hängt und genau das getestet wird.
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
            kind === "character" ? characterHref(p.slug) : archiveHref(p.slug),
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

// ── Verlinkungen zwischen Figuren ──────────────────────────────────────
// Die dritte Quelle: wer verweist im eigenen Text auf wen. Anders als
// Missionen und Gespräche ist eine Verlinkung gerichtet — „Tuvok erwähnt
// Sareth" heißt nicht, dass Sareth Tuvok erwähnt. Für die Beziehung zählt
// beides gleich, gegenseitige Verweise geben deshalb zwei Berührungspunkte.
//
// Drei Formen, alle im Projekt vorhanden und keine neue Pflege:
//   • [[Wikilinks]] im Fließtext (source_md) — von Hand getippt oder vom
//     Autolinking gesetzt (siehe src/lib/autolink.ts).
//   • Strukturierte Verweisfelder eines NPC-Eintrags auf Charaktere
//     (metadata.characters, siehe saveArchiveReferences in archive.ts).
//   • archive_links zwischen zwei NPC-Einträgen (dieselbe Tabelle, die
//     „Verweise" auf der Archivseite speist).
//
// Gelesen wird ausschließlich source_md, nie bio/content: dort steht bereits
// gerendertes HTML, in dem die Wikilinks aufgelöst sind.

// Nachschlagewerk zum Auflösen eines Wikilink-Ziels auf einen Knoten-Slug.
export interface LinkLookup {
  // Normalisierter Anzeigename → Slug.
  slugByName: Map<string, string>;
  // Alle bekannten Slugs — Rückfallebene für [[T'Mok]] → t-mok.
  slugs: Set<string>;
}

export function buildLinkLookup(
  nodes: Iterable<{ slug: string; name: string }>,
): LinkLookup {
  const slugByName = new Map<string, string>();
  const slugs = new Set<string>();
  for (const node of nodes) {
    // Erster Treffer gewinnt: die Aufrufer reichen Charaktere vor NPCs
    // hinein, dieselbe Rangfolge wie beim Auflösen der Wikilinks
    // (TYPE_PRIORITY in autolink.ts).
    const key = normalizeWikilinkTarget(node.name);
    if (!slugByName.has(key)) slugByName.set(key, node.slug);
    slugs.add(node.slug);
  }
  return { slugByName, slugs };
}

// Ein einzelnes Wikilink-Ziel ("Wirtin Sareth", "t-mok") auf einen Knoten.
// Spiegelt bewusst resolveAllWikilinks() in autolink.ts: zuerst der Titel,
// erst danach der Slug als Rückfallebene.
export function resolveLinkTarget(
  raw: string,
  lookup: LinkLookup,
): string | null {
  const byName = lookup.slugByName.get(normalizeWikilinkTarget(raw));
  if (byName) return byName;
  const slug = slugifyBase(raw);
  return lookup.slugs.has(slug) ? slug : null;
}

// Eine Figur (Charakter oder NPC) mit dem, was von ihr ausgeht.
export interface LinkSource {
  slug: string;
  sourceMd: string | null;
  // Strukturierte Verweise als Slugs (metadata.characters eines NPCs,
  // archive_links eines NPC-Eintrags).
  refs?: string[];
}

// Alle Ziele, auf die EINE Figur verweist — ohne sich selbst und ohne
// Dopplungen: dreimal derselbe Link im selben Text bleibt ein Verweis.
export function linkedSlugsOf(
  source: LinkSource,
  lookup: LinkLookup,
): string[] {
  const out = new Set<string>();
  for (const raw of wikilinkTargets(source.sourceMd ?? "")) {
    const slug = resolveLinkTarget(raw, lookup);
    if (slug && slug !== source.slug) out.add(slug);
  }
  for (const slug of source.refs ?? []) {
    if (lookup.slugs.has(slug) && slug !== source.slug) out.add(slug);
  }
  return [...out];
}

// Zählt die Verweise je Paar. Wie collectDialogueEdges ausgelagert und
// exportiert, damit die Auswertung ohne Datenbank testbar ist.
export function collectLinkEdges(
  sources: LinkSource[],
  lookup: LinkLookup,
): Map<string, number> {
  const pairs = new Map<string, number>();
  for (const source of sources) {
    if (!lookup.slugs.has(source.slug)) continue;
    for (const target of linkedSlugsOf(source, lookup)) {
      const key = edgeKey(source.slug, target);
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
  return pairs;
}

interface LinkCharacterRow {
  slug: string;
  name: string;
  source_md: string | null;
}

interface LinkNpcRow extends LinkCharacterRow {
  visibility: Visibility;
  owner_user_id: number | null;
  character_refs: { slug?: string }[] | null;
}

// Lädt Knoten und Verweise der ganzen Kampagne in einem Rutsch: Charaktere,
// NPC-Einträge und die Verweise zwischen zwei NPC-Einträgen. Bewusst
// vollständig statt je Figur vorgefiltert — ein Wikilink lässt sich in SQL
// nicht zuverlässig vergleichen (siehe src/lib/mentions.ts), und der Text
// aller Figuren und NPCs ist bei einer Kampagne dieser Größe eine Abfrage
// wert. Dieselbe Ladung versorgt die Charakterseite und den Gesamtgraphen.
//
// Knoten ist nur, was der Betrachter auch sehen darf: öffentliche Charaktere
// (wie im Missions-Zweig) und die per canView() sichtbaren NPC-Einträge. Ein
// Verweis auf etwas anderes löst sich deshalb gar nicht erst auf. Das gilt
// auch für die AUSGEHENDEN Verweise einer nicht-öffentlichen Figur: sie ist
// selbst kein Knoten, ihre Links zählen also nicht — dasselbe Verhalten wie
// bei gemeinsamen Missionen, wo sie ebenfalls in keiner Kante auftaucht.
async function loadLinks(viewer: Viewer | null): Promise<{
  nodes: Map<string, GraphNode>;
  pairs: Map<string, number>;
}> {
  const [characterRows, npcRows, npcLinkRows] = await Promise.all([
    sql<LinkCharacterRow[]>`
      SELECT slug, name, source_md
      FROM characters
      WHERE deleted_at IS NULL AND is_draft = false AND visibility = 'public'
    `,
    sql<LinkNpcRow[]>`
      SELECT slug, title AS name, source_md, visibility, owner_user_id,
             metadata->'characters' AS character_refs
      FROM archive_entries
      WHERE category = 'npc' AND deleted_at IS NULL AND is_draft = false
    `,
    // Verweise zwischen zwei NPC-Einträgen (archive_links speist auch die
    // „Verweise"-Liste der Archivseite). Andere Kategorien sind hier keine
    // Knoten und würden nur ins Leere zeigen.
    sql<{ source: string; target: string }[]>`
      SELECT src.slug AS source, tgt.slug AS target
      FROM archive_links al
      JOIN archive_entries src ON src.id = al.source_id
      JOIN archive_entries tgt ON tgt.id = al.target_id
      WHERE src.category = 'npc' AND tgt.category = 'npc'
        AND src.deleted_at IS NULL AND src.is_draft = false
        AND tgt.deleted_at IS NULL AND tgt.is_draft = false
    `,
  ]);

  const visibleNpcs = npcRows.filter((r) =>
    canView(r.visibility, r.owner_user_id, viewer),
  );

  const nodes = new Map<string, GraphNode>();
  for (const row of characterRows) {
    nodes.set(row.slug, {
      slug: row.slug,
      name: row.name,
      kind: "character",
      href: characterHref(row.slug),
    });
  }
  for (const row of visibleNpcs) {
    if (nodes.has(row.slug)) continue;
    nodes.set(row.slug, {
      slug: row.slug,
      name: row.name,
      kind: "npc",
      href: archiveHref(row.slug),
    });
  }

  const lookup = buildLinkLookup(nodes.values());

  // Die archive_links eines NPCs zählen wie seine eigenen Verweise — beide
  // gehen von ihm aus.
  const npcRefs = new Map<string, string[]>();
  for (const row of npcLinkRows) {
    const list = npcRefs.get(row.source);
    if (list) list.push(row.target);
    else npcRefs.set(row.source, [row.target]);
  }

  const sources: LinkSource[] = [
    ...characterRows.map((row) => ({
      slug: row.slug,
      sourceMd: row.source_md,
    })),
    ...visibleNpcs.map((row) => ({
      slug: row.slug,
      sourceMd: row.source_md,
      refs: [
        ...(row.character_refs ?? [])
          .map((r) => r?.slug)
          .filter((s): s is string => typeof s === "string" && s.length > 0),
        ...(npcRefs.get(row.slug) ?? []),
      ],
    })),
  ];

  return { nodes, pairs: collectLinkEdges(sources, lookup) };
}

export async function getRelationGraph(
  viewer: Viewer | null,
): Promise<RelationGraph> {
  const [missionRows, dialogueRows, links] = await Promise.all([
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
    loadLinks(viewer),
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
      sharedLinks: 0,
    };
    edges.set(key, {
      ...existing,
      sharedMissions: existing.sharedMissions + (patch.sharedMissions ?? 0),
      sharedDialogues: existing.sharedDialogues + (patch.sharedDialogues ?? 0),
      sharedLinks: existing.sharedLinks + (patch.sharedLinks ?? 0),
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
          href: characterHref(slug),
        });
      }
    }
    putEdge(row.aSlug, row.bSlug, { sharedMissions: row.shared });
  }

  // Verlinkungen vor den Gesprächen einhängen: ihre Namen kommen aus den
  // Tabellen (characters.name/archive_entries.title), die im Gesprächs-JSON
  // gespeicherten können veraltet sein.
  for (const [slug, node] of links.nodes) {
    if (!nodes.has(slug)) nodes.set(slug, node);
  }
  for (const [key, count] of links.pairs) {
    const [a, b] = key.split("|");
    putEdge(a, b, { sharedLinks: count });
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
