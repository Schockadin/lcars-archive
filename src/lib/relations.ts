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
