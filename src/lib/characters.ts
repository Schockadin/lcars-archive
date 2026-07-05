import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { markdownToHtml } from "@/lib/markdown";
import { slugifyBase } from "@/lib/slug";
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

// Entfernt alle Charakter-Zuweisungen eines Users — genutzt, wenn ein User
// auf die Gast-Rolle herabgestuft wird (siehe updateUserRoleAction in
// src/app/users/actions.ts), da Gästen laut Produktentscheidung kein
// Charakter zugeordnet sein darf.
export async function unassignCharactersFromUser(
  userId: number,
): Promise<void> {
  await sql`
    UPDATE characters SET player_id = NULL WHERE player_id = ${userId}
  `;
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
export async function getLogsForUser(
  userId: number,
): Promise<UserContentLog[]> {
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

// Für die Admin-Action "Autolinking" (src/app/actions/autolink.ts) — braucht
// id + rohen Markdown-Quelltext, unabhängig von Sichtbarkeit/Owner (Admins
// dürfen jeden Charakter autolinken).
export async function getCharacterSourceBySlug(
  slug: string,
): Promise<{ id: number; sourceMarkdown: string | null } | null> {
  const rows = await sql<{ id: number; sourceMarkdown: string | null }[]>`
    SELECT id, source_md AS "sourceMarkdown" FROM characters WHERE slug = ${slug}
  `;
  return rows[0] ?? null;
}

export async function updateCharacterBio(
  characterId: number,
  bodyMarkdown: string,
  bio: string,
): Promise<void> {
  await sql`
    UPDATE characters
    SET bio = ${bio}, source_md = ${bodyMarkdown}, updated_at = NOW()
    WHERE id = ${characterId}
  `;
}

// Probiert slugifyBase(name), "${base}-2", "${base}-3", … bis ein Slug in
// characters frei ist — analog generateUniqueArchiveEntrySlug in
// src/lib/archive.ts, hier für die Selbstanlage eigener Charaktere.
export async function generateUniqueCharacterSlug(
  name: string,
): Promise<string> {
  const base = slugifyBase(name);
  let candidate = base;
  let n = 2;

  for (;;) {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM characters WHERE slug = ${candidate}) AS exists
    `;
    if (!row.exists) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

// Legt einen neuen, eigenen Charakter an (User-Feature: jeder eingeloggte
// User außer Gast-Accounts darf eigene Charaktere anlegen, siehe
// /users/[id]/characters/new/actions.ts — die Gast-Sperre lebt dort, weil
// Gäste laut Produktentscheidung keinen Charakter zugewiesen haben dürfen,
// siehe assignCharacterAction in src/app/users/actions.ts). player_id wird
// direkt auf den anlegenden User gesetzt (sofortige Verknüpfung).
// visibility bleibt unangegeben → DB-Default 'public' (gleiche Konvention
// wie createArchiveEntry/createMission). Felder ohne eigene Spalte
// (age/affiliation/player/tags/generation) bleiben leer/null — das volle
// Bearbeiten-Formular deckt nur die für Spieler-Charaktere relevanten
// Metadaten-Felder ab, der Rest ist admin-only Ingest-Domäne.
export async function createCharacter(input: {
  name: string;
  status: Character["status"];
  portrait: string | null;
  rank: string | null;
  species: string[];
  homeworld: string | null;
  aliases: string[];
  bodyMarkdown: string;
  ownerUserId: number;
  // Vorgerendertes HTML überspringt das eigene markdownToHtml() — genutzt
  // vom Opt-in "Automatisch verlinken", siehe createArchiveEntry in
  // src/lib/archive.ts für dieselbe Begründung.
  bioHtml?: string;
}): Promise<{ id: number; slug: string }> {
  const slug = await generateUniqueCharacterSlug(input.name);
  const trimmedBody = input.bodyMarkdown.trim();
  const bio = trimmedBody ? (input.bioHtml ?? (await markdownToHtml(trimmedBody))) : null;
  const sourceMd = trimmedBody || null;

  const metadata = {
    rank: input.rank,
    species: input.species,
    homeworld: input.homeworld,
    age: null,
    affiliation: null,
    player: null,
    tags: [],
    aliases: input.aliases,
    generation: [],
  };

  const [row] = await sql<{ id: number; slug: string }[]>`
    INSERT INTO characters (
      slug, name, status, player_id, portrait, bio, metadata,
      source_md, frontmatter, updated_at
    ) VALUES (
      ${slug}, ${input.name}, ${input.status}, ${input.ownerUserId}, ${input.portrait},
      ${bio}, ${sql.json(metadata as ReturnType<typeof JSON.parse>)}, ${sourceMd},
      ${sql.json({})}, NOW()
    )
    RETURNING id, slug
  `;
  return row;
}

export interface OwnCharacterForEdit {
  id: number;
  slug: string;
  name: string;
  status: Character["status"];
  portrait: string | null;
  rank: string | null;
  species: string[];
  homeworld: string | null;
  aliases: string[];
  sourceMarkdown: string;
}

// Für /users/[id]/characters/[characterId]/edit — lädt die für das volle
// Bearbeiten-Formular relevanten Felder (Metadaten-Teilmenge, siehe
// createCharacter oben) plus den rohen Markdown-Body. Owner-gescoped wie
// setCharacterVisibility oben — ein fremdes/gefälschtes id trifft dann
// einfach 0 Zeilen. slug wird zusätzlich zurückgegeben, damit das Opt-in
// "Automatisch verlinken" den Charakter selbst als Autolinking-Ziel
// ausschließen kann.
export async function getOwnCharacterForEdit(
  userId: number,
  characterId: number,
): Promise<OwnCharacterForEdit | null> {
  const rows = await sql<
    {
      id: number;
      slug: string;
      name: string;
      status: Character["status"];
      portrait: string | null;
      metadata: CharacterMetadata | string;
      sourceMarkdown: string;
    }[]
  >`
    SELECT id, slug, name, status, portrait, metadata,
           COALESCE(source_md, '') AS "sourceMarkdown"
    FROM characters
    WHERE id = ${characterId} AND player_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const metadata: CharacterMetadata =
    typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    portrait: row.portrait,
    sourceMarkdown: row.sourceMarkdown,
    rank: metadata.rank,
    species: metadata.species,
    homeworld: metadata.homeworld,
    aliases: metadata.aliases,
  };
}

// Bearbeitet Name/Status/Portrait/Metadaten-Teilmenge/Bio eines eigenen
// Charakters — für das volle Bearbeiten-Formular. Owner-gescoped im WHERE
// (gleiches Prinzip wie updateOwnArchiveEntryContent in src/lib/archive.ts).
// metadata wird per jsonb-||-Merge nur in den hier editierten Feldern
// überschrieben (rank/species/homeworld/aliases) — age/affiliation/player/
// tags/generation (nicht Teil dieses Formulars) bleiben dadurch unangetastet
// statt bei jedem Speichern verloren zu gehen.
export async function updateOwnCharacterContent(
  userId: number,
  characterId: number,
  input: {
    name: string;
    status: Character["status"];
    portrait: string | null;
    rank: string | null;
    species: string[];
    homeworld: string | null;
    aliases: string[];
    bodyMarkdown: string;
    // Siehe createCharacter oben — Opt-in "Automatisch verlinken".
    bioHtml?: string;
  },
): Promise<{ slug: string } | null> {
  const trimmedBody = input.bodyMarkdown.trim();
  const bio = trimmedBody ? (input.bioHtml ?? (await markdownToHtml(trimmedBody))) : null;
  const sourceMd = trimmedBody || null;

  const metadataPatch = {
    rank: input.rank,
    species: input.species,
    homeworld: input.homeworld,
    aliases: input.aliases,
  };

  const rows = await sql<{ slug: string }[]>`
    UPDATE characters
    SET name = ${input.name}, status = ${input.status}, portrait = ${input.portrait},
        metadata = metadata || ${sql.json(metadataPatch as ReturnType<typeof JSON.parse>)},
        bio = ${bio}, source_md = ${sourceMd}, updated_at = NOW()
    WHERE id = ${characterId} AND player_id = ${userId}
    RETURNING slug
  `;
  return rows[0] ?? null;
}

// Nur die Biografie, nicht Name/Status/Metadaten — für den Inline-Editor auf
// der Detailseite (CharacterBioEditor.tsx), analog updateOwnArchiveEntryBody
// in src/lib/archive.ts. Anders als dort darf der Text leer sein (ein
// Charakter ohne Bio ist ein normaler Zustand, siehe die "Keine
// biografischen Daten"-Leerdarstellung in CharacterHero.tsx) — bio/source_md
// werden dann auf null gesetzt statt einen leeren String zu speichern.
export async function updateOwnCharacterBio(
  userId: number,
  characterId: number,
  bodyMarkdown: string,
  // Siehe createCharacter oben — Opt-in "Automatisch verlinken".
  bioHtmlOverride?: string,
): Promise<{ slug: string; bio: string | null } | null> {
  const trimmedBody = bodyMarkdown.trim();
  const bio = trimmedBody ? (bioHtmlOverride ?? (await markdownToHtml(trimmedBody))) : null;
  const sourceMd = trimmedBody || null;

  const rows = await sql<{ slug: string }[]>`
    UPDATE characters
    SET bio = ${bio}, source_md = ${sourceMd}, updated_at = NOW()
    WHERE id = ${characterId} AND player_id = ${userId}
    RETURNING slug
  `;
  const row = rows[0];
  return row ? { slug: row.slug, bio } : null;
}
