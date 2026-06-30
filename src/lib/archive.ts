import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import {
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
      ORDER BY title ASC
    `;
    return rows.map(parseMeta);
  },
  // Key-Version "2": die Metadata-Shape hat sich geändert (neue Felder) —
  // Bump verwirft alte Cache-Einträge deterministisch (auch poisoned-empty).
  ["getAllArchiveEntries", "v2"],
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
    ["getArchiveEntryBySlug", "v2", slug],
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
          AND metadata->'participants' @> ${sql.json([{ slug }])}
      `;
      return row?.count ?? 0;
    },
    ["getDialogueCountByParticipant", slug],
    { tags: [cacheTags.archive] },
  )();
}

// Alle Pfade für Sitemap und generateStaticParams.
export const getAllArchivePaths = unstable_cache(
  async (): Promise<ArchivePath[]> => {
    const rows = await sql<ArchivePath[]>`
      SELECT slug, updated_at::text AS updated_at
      FROM archive_entries
    `;
    return rows;
  },
  ["getAllArchivePaths", "v2"],
  { tags: [cacheTags.archive] },
);
