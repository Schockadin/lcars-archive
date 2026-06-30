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

// metadata kommt je nach Treiber als JSONB-Objekt oder String — wie bei den
// Missionen/Charakteren defensiv zum Objekt normalisieren.
function parseMeta<T extends { metadata: ArchiveMetadata }>(row: T): T {
  return {
    ...row,
    metadata:
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as ArchiveMetadata)
        : row.metadata,
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
  ["getAllArchiveEntries"],
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
    ["getArchiveEntryBySlug", slug],
    { tags: [cacheTags.archive, cacheTags.archiveEntry(slug)] },
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
  ["getAllArchivePaths"],
  { tags: [cacheTags.archive] },
);
