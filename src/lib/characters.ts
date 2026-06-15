import sql from '@/lib/db';
import { Character } from '@/types/character';

// Alle Charaktere, sortiert nach Status dann Name
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
  return rows;
}

// Einzelner Charakter per Slug
export async function getCharacterBySlug(
  slug: string
): Promise<Character | null> {
  const rows = await sql<Character[]>`
    SELECT *
    FROM characters
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Nur aktive Charaktere – z.B. für Autorenauswahl in Logbüchern
export async function getActiveCharacters(): Promise<Character[]> {
  const rows = await sql<Character[]>`
    SELECT id, slug, name, metadata
    FROM characters
    WHERE status = 'active'
    ORDER BY name ASC
  `;
  return rows;
}