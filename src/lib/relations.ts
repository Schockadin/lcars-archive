import "server-only";
import sql from "@/lib/db";
import { wikilinkTargets } from "@/lib/mentions";
import { slugifyBase, normalizeWikilinkTarget } from "@/lib/slug";
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
//      auf Charaktere (metadata.characters). Wer im Text eines anderen
//      auftaucht, hat mit ihm zu tun — auch ohne je zusammen im Einsatz
//      gewesen zu sein.
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

// Ohne Betrachter-Parameter: Alle Abfragen führen ausschließlich
// veröffentlichte Inhalte, und die sieht seit v1.34 jede und jeder.
export async function getRelationsOf(
  characterSlug: string,
): Promise<Relation[]> {
  const [missionRows, dialogueRows, links] = await Promise.all([
    // Gemeinsame Missionen: über mission_participants auf sich selbst
    // zurückgejoint. Nur veröffentlichte, nicht gelöschte Charaktere.
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
        AND m.deleted_at IS NULL AND m.is_draft = false
      GROUP BY other.slug, other.name
    `,
    sql<DialogueRow[]>`
      SELECT metadata->'participants' AS participants
      FROM archive_entries
      WHERE category = 'dialogue'
        AND deleted_at IS NULL AND is_draft = false
        AND metadata->'participants' @> ${sql.json([
          { slug: characterSlug },
        ] as unknown as ReturnType<typeof JSON.parse>)}
    `,
    loadLinks(),
  ]);

  // Die Abfrage führt nur veröffentlichte Gespräche (is_draft = false) —
  // seit v1.34 sieht die jede und jeder.
  const visibleDialogues = dialogueRows;
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

// ── Die Figuren hinter den Verbindungen ────────────────────────────────
// Ein Knoten ist eine Figur oder ein NPC-Eintrag: Name, Art und Adresse, wie
// sie „Wer kennt wen" auf der Charakterseite anzeigt.

export interface GraphNode {
  slug: string;
  name: string;
  kind: "character" | "npc";
  href: string;
}

// Paar-Schlüssel: sortiertes Slug-Paar. Exportiert, weil die Zusammenführung
// der Verweise daran hängt und genau das getestet wird.
export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ── Verlinkungen zwischen Figuren ──────────────────────────────────────
// Die dritte Quelle neben Missionen und Gesprächen: wer verweist im eigenen
// Text auf wen. Anders als diese beiden ist eine Verlinkung gerichtet —
// „Tuvok erwähnt Sareth" heißt nicht, dass Sareth Tuvok erwähnt. Für die
// Beziehung zählt beides gleich, gegenseitige Verweise geben deshalb zwei
// Berührungspunkte.
//
// Zwei Formen, beide im Projekt vorhanden und keine neue Pflege:
//   • [[Wikilinks]] im Fließtext (source_md) — von Hand getippt oder vom
//     Autolinking gesetzt (siehe src/lib/autolink.ts).
//   • Strukturierte Verweisfelder eines NPC-Eintrags auf Charaktere
//     (metadata.characters, siehe saveArchiveReferences in archive.ts).
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
  // Strukturierte Verweise als Slugs (metadata.characters eines NPCs).
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

// Zählt die Verweise je Paar. Wie countDialoguePartners ausgelagert und
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
  character_refs: { slug?: string }[] | null;
}

// Lädt Knoten und Verweise der ganzen Kampagne in einem Rutsch: Charaktere
// und NPC-Einträge. Bewusst vollständig statt je Figur vorgefiltert — ein
// Wikilink lässt sich in SQL nicht zuverlässig vergleichen (siehe
// src/lib/mentions.ts), und der Text aller Figuren und NPCs ist bei einer
// Kampagne dieser Größe eine Abfrage wert.
//
// Verweise zwischen ZWEI NPC-Einträgen (archive_links) wurden hier früher
// mitgeladen — sie speisten ausschließlich den Gesamtgraphen. Seit der weg
// ist, fragt nur noch die Charakterseite (getRelationsOf) diese Ladung ab,
// und die behält nur Paare, an denen ihre Figur hängt: ein NPC-NPC-Paar
// könnte darin nie auftauchen. Die Abfrage ist deshalb ersatzlos entfallen.
//
// Knoten ist nur, was veröffentlicht ist: Entwürfe (Charaktere wie
// NPC-Einträge) bleiben draußen, auch für ihre Owner-Person. Ein Verweis auf
// etwas anderes löst sich deshalb gar nicht erst auf — dasselbe Verhalten wie
// bei gemeinsamen Missionen, wo ein Entwurf ebenfalls in keiner Kante
// auftaucht.
async function loadLinks(): Promise<{
  nodes: Map<string, GraphNode>;
  pairs: Map<string, number>;
}> {
  const [characterRows, npcRows] = await Promise.all([
    sql<LinkCharacterRow[]>`
      SELECT slug, name, source_md
      FROM characters
      WHERE deleted_at IS NULL AND is_draft = false
    `,
    sql<LinkNpcRow[]>`
      SELECT slug, title AS name, source_md,
             metadata->'characters' AS character_refs
      FROM archive_entries
      WHERE category = 'npc' AND deleted_at IS NULL AND is_draft = false
    `,
  ]);

  const visibleNpcs = npcRows;

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

  const sources: LinkSource[] = [
    ...characterRows.map((row) => ({
      slug: row.slug,
      sourceMd: row.source_md,
    })),
    ...visibleNpcs.map((row) => ({
      slug: row.slug,
      sourceMd: row.source_md,
      refs: (row.character_refs ?? [])
        .map((r) => r?.slug)
        .filter((s): s is string => typeof s === "string" && s.length > 0),
    })),
  ];

  return { nodes, pairs: collectLinkEdges(sources, lookup) };
}
