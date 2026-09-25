import sql from "@/lib/db";
import type postgres from "postgres";
import { renderContentHtml } from "@/lib/autolink";
import { syncEmbeddingActive, syncEmbeddings } from "@/lib/embeddingSync";
import { slugifyBase } from "@/lib/slug";
import { normalizeCharacterMetadata } from "@/lib/characterFormat";
import type { CharacterMetadata } from "@/types/character";

type ConversionStatus = "active" | "retired" | "deceased";

export type CharacterNpcConversionResult =
  | { status: "converted"; characterSlug: string; npcSlug: string }
  | { status: "not-found" }
  | { status: "already-converted" }
  | { status: "active" }
  | { status: "changed" };

export type CharacterNpcRestoreResult =
  | { status: "restored"; characterSlug: string; npcSlug: string }
  | { status: "not-found" };

export interface OwnedCharacterNpcConversion {
  id: number;
  name: string;
  rank: string | null;
  status: "retired" | "deceased";
  isDraft: boolean;
  npcSlug: string;
}

export async function listOwnedCharacterNpcConversions(
  userId: number,
): Promise<OwnedCharacterNpcConversion[]> {
  return sql<OwnedCharacterNpcConversion[]>`
    SELECT c.id, c.name, c.metadata->>'rank' AS rank, c.status,
           c.is_draft AS "isDraft", npc.slug AS "npcSlug"
    FROM characters c
    JOIN character_npc_conversions conversion
      ON conversion.character_id = c.id
    JOIN archive_entries npc ON npc.id = conversion.archive_entry_id
    WHERE c.player_id = ${userId} AND c.deleted_at IS NULL
    ORDER BY c.name ASC
  `;
}

function displayStatus(status: ConversionStatus): string {
  if (status === "deceased") return "Verstorben";
  if (status === "retired") return "Inaktiv";
  return "Aktiv";
}

function markdownValue(value: unknown): string | null {
  // Ältere/importierte Charakterakten enthalten vereinzelt Nicht-Textwerte
  // in optionalen Metadatenfeldern. Nicht darstellbare Werte sollen die
  // Umwandlung nicht abbrechen, sondern einfach ausgelassen werden.
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.replace(/\r?\n/g, " ") : null;
}

export function buildCharacterNpcMarkdown(input: {
  status: ConversionStatus;
  metadata: CharacterMetadata;
  bodyMarkdown: string | null;
  portrait: string | null;
}): string {
  const metadata = normalizeCharacterMetadata(input.metadata);
  const rows: [string, string | null][] = [
    ["Status", displayStatus(input.status)],
    ["Rang", markdownValue(metadata.rank)],
    ["Spezies", metadata.species.join(", ") || null],
    ["Heimatwelt", markdownValue(metadata.homeworld)],
    ["Alter", metadata.age === null ? null : String(metadata.age)],
    ["Geburtsdatum", markdownValue(metadata.dateOfBirth)],
    [
      "Generation",
      metadata.generation.length ? metadata.generation.join(", ") : null,
    ],
    ["Fraktionen", metadata.affiliation?.factions.join(", ") || null],
    ["Schiffe", metadata.affiliation?.ships.join(", ") || null],
    ["Division", markdownValue(metadata.affiliation?.division)],
    ["Aliase", metadata.aliases.join(", ") || null],
  ];
  const details = rows
    .filter((row): row is [string, string] => row[1] !== null)
    .map(([label, value]) => `- **${label}:** ${value}`);
  const bio = input.bodyMarkdown?.trim();
  const portrait = input.portrait
    ? `![Profilbild](<${input.portrait}>)`
    : null;
  return [
    ...(portrait ? [portrait, ""] : []),
    "## Charakterdaten",
    ...details,
    ...(bio ? ["", "## Biografie", bio] : []),
  ].join("\n");
}

async function uniqueNpcSlug(
  tx: postgres.TransactionSql,
  title: string,
): Promise<string> {
  const base = slugifyBase(title);
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const [row] = await tx<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM archive_entries WHERE slug = ${candidate}
      ) AS exists
    `;
    if (!row.exists) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

// Charakter, NPC-Eintrag und Zuordnung entstehen atomar. Der Originalbogen
// bleibt erhalten, damit alle historischen Verknüpfungen intakt bleiben.
export async function convertOwnedCharacterToNpc(
  userId: number,
  characterId: number,
): Promise<CharacterNpcConversionResult> {
  const [preparedCharacter] = await sql<
    {
      name: string;
      status: ConversionStatus;
      portrait: string | null;
      metadata: CharacterMetadata | string;
      sourceMarkdown: string | null;
      tags: string[] | null;
      isDraft: boolean;
      updatedAt: Date;
    }[]
  >`
    SELECT name, status, portrait, metadata, source_md AS "sourceMarkdown",
           metadata->'tags' AS tags, is_draft AS "isDraft",
           updated_at AS "updatedAt"
    FROM characters
    WHERE id = ${characterId} AND player_id = ${userId}
      AND deleted_at IS NULL
    LIMIT 1
  `;
  if (!preparedCharacter) return { status: "not-found" };
  if (preparedCharacter.status === "active") return { status: "active" };

  const preparedMetadata =
    typeof preparedCharacter.metadata === "string"
      ? (JSON.parse(preparedCharacter.metadata) as CharacterMetadata)
      : preparedCharacter.metadata;
  const normalizedMetadata = normalizeCharacterMetadata(preparedMetadata);
  const markdown = buildCharacterNpcMarkdown({
    status: preparedCharacter.status,
    metadata: normalizedMetadata,
    bodyMarkdown: preparedCharacter.sourceMarkdown,
    portrait: preparedCharacter.portrait,
  });
  // Wikilink-Auflösung fragt weitere Tabellen ab und muss außerhalb der
  // offenen Transaktion laufen. updated_at wird danach unter Lock verglichen.
  const html = await renderContentHtml(markdown);

  const result = await sql.begin(async (tx) => {
    const [character] = await tx<
      {
        id: number;
        slug: string;
        name: string;
        status: ConversionStatus;
        metadata: CharacterMetadata | string;
        sourceMarkdown: string | null;
        tags: string[] | null;
        isDraft: boolean;
        archiveEntryId: number | null;
        updatedAt: Date;
      }[]
    >`
      SELECT c.id, c.slug, c.name, c.status, c.metadata,
             c.source_md AS "sourceMarkdown", c.metadata->'tags' AS tags,
             c.is_draft AS "isDraft",
             conversion.archive_entry_id AS "archiveEntryId",
             c.updated_at AS "updatedAt"
      FROM characters c
      LEFT JOIN character_npc_conversions conversion
        ON conversion.character_id = c.id
      WHERE c.id = ${characterId}
        AND c.player_id = ${userId}
        AND c.deleted_at IS NULL
      FOR UPDATE OF c
    `;

    if (!character) return { status: "not-found" as const };
    if (
      character.updatedAt.getTime() !== preparedCharacter.updatedAt.getTime()
    ) {
      return { status: "changed" as const };
    }
    const [existingConversion] = await tx<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM character_npc_conversions
        WHERE character_id = ${characterId}
      ) AS exists
    `;
    if (character.archiveEntryId !== null || existingConversion.exists) {
      return { status: "already-converted" as const };
    }
    if (character.status === "active") return { status: "active" as const };

    const slug = await uniqueNpcSlug(tx, character.name);
    const archiveMetadata = {
      summary: `Aus dem Charakter „${character.name}“ übernommen.`,
      aliases: normalizedMetadata.aliases,
      attributes: [],
      characters: [],
      missions: [],
      setting: null,
      logDate: null,
      participants: [],
      location: null,
    };
    const [npc] = await tx<{ id: number; slug: string }[]>`
      INSERT INTO archive_entries (
        slug, title, category, content, tags, metadata, source_md,
        frontmatter, owner_user_id, is_draft, updated_at
      ) VALUES (
        ${slug}, ${character.name}, 'npc', ${html},
        ${character.tags ?? []}, ${tx.json(archiveMetadata)}, ${markdown},
        ${tx.json({})}, ${userId}, ${character.isDraft}, NOW()
      )
      RETURNING id, slug
    `;
    await tx`
      INSERT INTO character_npc_conversions
        (character_id, archive_entry_id, original_status, converted_by)
      VALUES (${character.id}, ${npc.id}, ${character.status}, ${userId})
    `;
    return {
      status: "converted" as const,
      characterSlug: character.slug,
      npcSlug: npc.slug,
      npcId: npc.id,
      characterId: character.id,
    };
  });

  if (result.status !== "converted") return result;
  syncEmbeddingActive("character", result.characterId, false);
  syncEmbeddings("archive_entry", result.npcId);
  return result;
}

// Die Rücknahme blendet den erzeugten NPC soft aus und stellt den gespeicherten
// Charakterstatus wieder her; auch spätere NPC-Änderungen bleiben im Papierkorb.
export async function restoreOwnedCharacterFromNpc(
  userId: number,
  characterId: number,
): Promise<CharacterNpcRestoreResult> {
  const result = await sql.begin(async (tx) => {
    const [conversion] = await tx<
      {
        characterId: number;
        characterSlug: string;
        npcId: number;
        npcSlug: string;
        originalStatus: "retired" | "deceased";
      }[]
    >`
      SELECT c.id AS "characterId", c.slug AS "characterSlug",
             a.id AS "npcId", a.slug AS "npcSlug",
             conversion.original_status AS "originalStatus"
      FROM characters c
      JOIN character_npc_conversions conversion
        ON conversion.character_id = c.id
      JOIN archive_entries a ON a.id = conversion.archive_entry_id
      WHERE c.id = ${characterId}
        AND c.player_id = ${userId}
        AND c.deleted_at IS NULL
      FOR UPDATE OF c, a
    `;
    if (!conversion) return { status: "not-found" as const };

    await tx`
      UPDATE archive_entries
      SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
      WHERE id = ${conversion.npcId}
    `;
    await tx`
      UPDATE characters
      SET status = ${conversion.originalStatus}, updated_at = NOW()
      WHERE id = ${characterId}
    `;
    await tx`
      DELETE FROM character_npc_conversions
      WHERE character_id = ${characterId}
    `;
    return {
      status: "restored" as const,
      characterSlug: conversion.characterSlug,
      npcSlug: conversion.npcSlug,
      npcId: conversion.npcId,
      characterId,
    };
  });

  if (result.status !== "restored") return result;
  syncEmbeddingActive("archive_entry", result.npcId, false);
  syncEmbeddingActive("character", result.characterId, true);
  return result;
}
