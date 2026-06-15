import sql from '@/lib/db';
import { Character, CharacterMetadata } from '@/types/character';

// Hilfsfunktion: stellt sicher dass metadata ein Objekt ist
function parseCharacter(row: Character): Character {
  return {
    ...row,
    metadata: typeof row.metadata === 'string'
      ? JSON.parse(row.metadata) as CharacterMetadata
      : row.metadata,
  };
}

export async function getAllCharacters(): Promise<Character[]> {
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
}

export async function getCharacterBySlug(
  slug: string
): Promise<Character | null> {
  const rows = await sql<Character[]>`
    SELECT *
    FROM characters
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ? parseCharacter(rows[0]) : null;
}

export async function getActiveCharacters(): Promise<Character[]> {
  const rows = await sql<Character[]>`
    SELECT id, slug, name, metadata
    FROM characters
    WHERE status = 'active'
    ORDER BY name ASC
  `;
  return rows.map(parseCharacter);
}