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

// Nur public-Charaktere — speist die öffentliche Übersicht, die Detail-
// generateStaticParams und die öffentliche API-Route. private/gm-Charaktere
// bleiben trotzdem über ihre Detailseite erreichbar (Laufzeit-Guard dort).
export const getAllCharacters = unstable_cache(
  async (): Promise<Character[]> => {
    const rows = await sql<Character[]>`
      SELECT *
      FROM characters
      WHERE visibility = 'public'
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
  ["getAllCharacters", "v2"],
  { tags: [cacheTags.characters] },
);

// Ungefiltert — nur für die GM/Admin-Charakterzuweisung (/users), die auch
// private/gm-Charaktere zuordnen können muss.
export const getAllCharactersForAdmin = unstable_cache(
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
  ["getAllCharactersForAdmin"],
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
      WHERE status = 'active' AND visibility = 'public'
      ORDER BY name ASC
    `;
    return rows.map(parseCharacter);
  },
  ["getActiveCharacters", "v2"],
  { tags: [cacheTags.characters] },
);

// Charaktere eines Users (siehe assignCharacterToUser). Kein Cache — die
// Dashboard-Route ist durch den Session-Zugriff ohnehin dynamisch, analog
// zu getUserById in src/lib/users.ts.
export async function getCharactersForUser(
  userId: number,
): Promise<Character[]> {
  const rows = await sql<Character[]>`
    SELECT *
    FROM characters
    WHERE player_id = ${userId}
    ORDER BY name ASC
  `;
  return rows.map(parseCharacter);
}

export interface CharacterWithOwner {
  id: number;
  slug: string;
  name: string;
  playerId: number;
  playerName: string;
}

// Alle Charaktere mit Spieler außer denen von excludeUserId — Partner-
// Picker für "Gespräch beginnen" (src/app/users/[id]/dialogues/new). Kein
// Cache, gleiche Begründung wie getCharactersForUser.
export async function getCharactersWithPlayers(
  excludeUserId: number,
): Promise<CharacterWithOwner[]> {
  return sql<CharacterWithOwner[]>`
    SELECT c.id, c.slug, c.name, c.player_id AS "playerId", u.name AS "playerName"
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.player_id IS NOT NULL AND c.player_id != ${excludeUserId}
    ORDER BY c.name ASC
  `;
}

// GM-only-Zuweisung (siehe src/app/users/actions.ts). player_id wird vom
// Ingest nie angefasst (scripts/ingest/characters.ts), Zuweisungen
// überleben also einen Re-Ingest.
export async function assignCharacterToUser(
  characterId: number,
  userId: number | null,
): Promise<Character> {
  const rows = await sql<Character[]>`
    UPDATE characters
    SET player_id = ${userId}
    WHERE id = ${characterId}
    RETURNING *
  `;
  return parseCharacter(rows[0]);
}

// Nur der Owner (player_id) darf die Sichtbarkeit ändern — ein fremdes/
// gefälschtes id trifft dann einfach 0 Zeilen (gleiches Prinzip wie
// assignCharacterToUser oben).
export async function setCharacterVisibility(
  userId: number,
  characterId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE characters
    SET visibility = ${visibility}, updated_at = NOW()
    WHERE id = ${characterId} AND player_id = ${userId}
    RETURNING slug
  `;
  return rows[0] ?? null;
}

export interface UserContentLog {
  id: number;
  slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
  mission_slug: string;
  mission_title: string;
  character_slug: string;
  character_name: string;
  visibility: "private" | "gm" | "public";
}

// Alle Mission-Logs der eigenen Charaktere für /users/[id]/content. Ungecacht
// wie getCharactersForUser — die Seite ist ohnehin durch requireOwnCharacters
// (Session-Zugriff) dynamisch. Liefert den verfassenden eigenen Charakter
// mit, damit die Seite nach Charakter gruppieren kann.
export async function getLogsForUser(userId: number): Promise<UserContentLog[]> {
  return sql<UserContentLog[]>`
    SELECT
      ml.id, ml.slug, ml.title, ml.session_nr, ml.log_date::text AS log_date,
      m.slug AS mission_slug, m.title AS mission_title, ml.visibility,
      c.slug AS character_slug, c.name AS character_name
    FROM mission_logs ml
    JOIN characters c ON c.id = ml.author_id
    JOIN missions m ON m.id = ml.mission_id
    WHERE c.player_id = ${userId}
    ORDER BY ml.session_nr DESC NULLS LAST
  `;
}

// Nur public-Logs — rendert auf der öffentlichen Charakterseite. Eigene
// private/gm-Logs sieht der Owner weiterhin über "Meine Inhalte"
// (getLogsForUser, unten) bzw. direkt über die (laufzeitgeprüfte)
// Log-Detailseite.
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
        WHERE ml.author_id = ${characterId} AND ml.visibility = 'public'
        ORDER BY ml.session_nr DESC NULLS LAST
      `;
      return rows;
    },
    ["getLogsByCharacter", "v2", String(characterId)],
    { tags: [cacheTags.missionLogs] },
  )();
}
