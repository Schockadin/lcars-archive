import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { Character, CharacterMetadata } from "@/types/character";
import { MissionLogPreview } from "@/types/missionLog";

// Hilfsfunktion: stellt sicher dass metadata ein Objekt ist
function parseCharacter(row: Character): Character {
  return {
    ...row,
    metadata:
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as CharacterMetadata)
        : row.metadata,
  };
}

export const getAllCharacters = unstable_cache(
  async (): Promise<Character[]> => {
    const rows = await sql<Character[]>`
      SELECT *
      FROM characters
      ORDER BY
        CASE status
          WHEN 'active'   THEN 1
          WHEN 'retired'  THEN 2
          WHEN 'deceased' THEN 3
        END,
        name ASC
    `;
    return rows.map(parseCharacter);
  },
  ["getAllCharacters"],
  { tags: [cacheTags.characters] },
);

export async function getCharacterBySlug(
  slug: string,
): Promise<Character | null> {
  return unstable_cache(
    async (): Promise<Character | null> => {
      const rows = await sql<Character[]>`
        SELECT *
        FROM characters
        WHERE slug = ${slug}
        LIMIT 1
      `;
      return rows[0] ? parseCharacter(rows[0]) : null;
    },
    ["getCharacterBySlug", slug],
    { tags: [cacheTags.characters, cacheTags.character(slug)] },
  )();
}

export const getActiveCharacters = unstable_cache(
  async (): Promise<Character[]> => {
    const rows = await sql<Character[]>`
      SELECT id, slug, name, metadata
      FROM characters
      WHERE status = 'active'
      ORDER BY name ASC
    `;
    return rows.map(parseCharacter);
  },
  ["getActiveCharacters"],
  { tags: [cacheTags.characters] },
);

export async function getLogsByCharacter(
  characterId: number,
): Promise<MissionLogPreview[]> {
  return unstable_cache(
    async (): Promise<MissionLogPreview[]> => {
      const rows = await sql<MissionLogPreview[]>`
        SELECT
          ml.id,
          ml.slug,
          ml.title,
          ml.session_nr,
          ml.log_date::text AS log_date,
          m.slug            AS mission_slug,
          m.title           AS mission_title
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        WHERE ml.author_id = ${characterId}
        ORDER BY ml.session_nr DESC NULLS LAST
      `;
      return rows;
    },
    ["getLogsByCharacter", String(characterId)],
    { tags: [cacheTags.missionLogs] },
  )();
}
