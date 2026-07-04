import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import {
  ArchiveCategory,
  ArchiveEntryDetail,
  ArchiveEntryPreview,
  ArchiveLink,
  ArchiveMetadata,
  ArchivePath,
} from "@/types/archive";

// metadata kommt je nach Treiber als JSONB-Objekt oder String — defensiv
// parsen UND auf die vollständige Form normalisieren, damit auch ältere
// Einträge (vor neuen Feldern importiert) eine konsistente Shape haben.
function parseMeta<T extends { metadata: ArchiveMetadata }>(row: T): T {
  const raw: Partial<ArchiveMetadata> =
    typeof row.metadata === "string"
      ? (JSON.parse(row.metadata) as Partial<ArchiveMetadata>)
      : (row.metadata ?? {});

  return {
    ...row,
    metadata: {
      summary: raw.summary ?? null,
      attributes: raw.attributes ?? [],
      characters: raw.characters ?? [],
      missions: raw.missions ?? [],
      setting: raw.setting ?? null,
      logDate: raw.logDate ?? null,
      participants: raw.participants ?? [],
      location: raw.location ?? null,
    },
  };
}

// Alle Archiv-Einträge für die Übersicht (ohne content). Alphabetisch nach
// Titel; die Gruppierung nach Kategorie übernimmt die Darstellung.
// Nur public-Einträge — diese Liste speist Übersicht/Nav/Sitemap und ist
// nicht nach Betrachter personalisierbar (unstable_cache, kein Session-
// Zugriff). private/gm-Einträge sind trotzdem über ihre Detailseite
// erreichbar (Laufzeit-Guard dort, siehe getArchiveEntryBySlug-Aufrufer).
export const getAllArchiveEntries = unstable_cache(
  async (): Promise<ArchiveEntryPreview[]> => {
    const rows = await sql<ArchiveEntryPreview[]>`
      SELECT
        id,
        slug,
        title,
        category,
        tags,
        metadata
      FROM archive_entries
      WHERE NOT (category = 'dialogue' AND dialogue_open)
        AND visibility = 'public'
      ORDER BY title ASC
    `;
    return rows.map(parseMeta);
  },
  // Key-Version "4": nur noch public-Einträge — Bump verwirft alte
  // Cache-Einträge deterministisch (auch poisoned-empty).
  ["getAllArchiveEntries", "v4"],
  { tags: [cacheTags.archive] },
);

// Ein Archiv-Eintrag per Slug inkl. aufgelöster Verweise (ein-/ausgehend).
export async function getArchiveEntryBySlug(
  slug: string,
): Promise<ArchiveEntryDetail | null> {
  return unstable_cache(
    async (): Promise<ArchiveEntryDetail | null> => {
      const rows = await sql<Omit<ArchiveEntryDetail, "links" | "backlinks">[]>`
        SELECT
          id,
          slug,
          title,
          category,
          content,
          tags,
          metadata,
          dialogue_open,
          visibility,
          owner_user_id AS "ownerUserId",
          updated_at::text AS updated_at
        FROM archive_entries
        WHERE slug = ${slug}
        LIMIT 1
      `;
      const entry = rows[0];
      if (!entry) return null;

      // Ausgehende Verweise (dieser Eintrag → Ziel).
      const links = await sql<ArchiveLink[]>`
        SELECT
          e.slug,
          e.title,
          e.category,
          al.label
        FROM archive_links al
        JOIN archive_entries e ON e.id = al.target_id
        WHERE al.source_id = ${entry.id}
        ORDER BY e.title ASC
      `;

      // Eingehende Verweise (Quelle → dieser Eintrag).
      const backlinks = await sql<ArchiveLink[]>`
        SELECT
          e.slug,
          e.title,
          e.category,
          al.label
        FROM archive_links al
        JOIN archive_entries e ON e.id = al.source_id
        WHERE al.target_id = ${entry.id}
        ORDER BY e.title ASC
      `;

      return { ...parseMeta(entry), links, backlinks };
    },
    ["getArchiveEntryBySlug", "v4", slug],
    { tags: [cacheTags.archive, cacheTags.archiveEntry(slug)] },
  )();
}

// Anzahl der Gespräche (Dialoge), an denen ein Teilnehmer (per slug — i.d.R.
// ein Charakter) beteiligt ist. jsonb-Containment auf metadata.participants.
export async function getDialogueCountByParticipant(
  slug: string,
): Promise<number> {
  return unstable_cache(
    async (): Promise<number> => {
      const [row] = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM archive_entries
        WHERE category = 'dialogue'
          AND NOT dialogue_open
          AND visibility = 'public'
          AND metadata->'participants' @> ${sql.json([{ slug }])}
      `;
      return row?.count ?? 0;
    },
    ["getDialogueCountByParticipant", "v3", slug],
    { tags: [cacheTags.archive] },
  )();
}

export interface UserContentArchiveEntry {
  id: number;
  slug: string;
  title: string;
  category: ArchiveCategory;
  visibility: "private" | "gm" | "public";
}

// Eigene Archiv-Einträge (owner_user_id, siehe scripts/schema.sql) für
// /users/[id]/content — ohne Kategorie 'dialogue', die dort separat über
// getDialoguesForUser läuft. Ungecacht wie getLogsForUser (Charaktere.ts):
// die Seite ist ohnehin durch requireOwnCharacters (Session-Zugriff)
// dynamisch.
export async function getArchiveEntriesForUser(
  userId: number,
): Promise<UserContentArchiveEntry[]> {
  return sql<UserContentArchiveEntry[]>`
    SELECT id, slug, title, category, visibility
    FROM archive_entries
    WHERE owner_user_id = ${userId} AND category != 'dialogue'
    ORDER BY title ASC
  `;
}

// Nur der Owner (owner_user_id) darf die Sichtbarkeit ändern — ein
// fremdes/gefälschtes id trifft dann einfach 0 Zeilen (gleiches Prinzip wie
// setDialogueVisibility in src/lib/dialoguesCore.ts, nur ohne die
// category='dialogue'-Einschränkung).
export async function setArchiveEntryVisibility(
  userId: number,
  archiveEntryId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET visibility = ${visibility}, updated_at = NOW()
    WHERE id = ${archiveEntryId} AND category != 'dialogue' AND owner_user_id = ${userId}
    RETURNING slug
  `;
  return rows[0] ?? null;
}

// Alle Pfade für Sitemap und generateStaticParams — nur public, damit
// private/gm-Einträge nicht statisch vorgerendert oder gesitemappt werden
// (siehe getAllArchiveEntries).
export const getAllArchivePaths = unstable_cache(
  async (): Promise<ArchivePath[]> => {
    const rows = await sql<ArchivePath[]>`
      SELECT slug, updated_at::text AS updated_at
      FROM archive_entries
      WHERE NOT (category = 'dialogue' AND dialogue_open)
        AND visibility = 'public'
    `;
    return rows;
  },
  ["getAllArchivePaths", "v4"],
  { tags: [cacheTags.archive] },
);
