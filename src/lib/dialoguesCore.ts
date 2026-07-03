// Enthält die eigentliche Dialog-Logik ohne "server-only"-Markierung, damit
// sie sowohl von der App (via dialogues.ts) als auch von
// scripts/seedExampleDialogue.ts (per tsx außerhalb von Next ausgeführt)
// importiert werden kann — exakt das gleiche Muster wie mailCore.ts/mail.ts.
import sql from "@/lib/db";
import { markdownToSafeHtml } from "@/lib/markdown";
import { slugifyBase } from "@/lib/slug";
import { getCharactersForUser } from "@/lib/characters";
import type { ArchiveParticipant, ArchiveLocationRef } from "@/types/archive";

export class DialogueSlugCollisionError extends Error {}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

function parseParticipants(metadata: unknown): ArchiveParticipant[] {
  const parsed =
    typeof metadata === "string"
      ? (JSON.parse(metadata) as { participants?: ArchiveParticipant[] })
      : (metadata as { participants?: ArchiveParticipant[] } | null);
  return parsed?.participants ?? [];
}

// Probiert slugifyBase(title), "${base}-2", "${base}-3", … bis ein Slug in
// archive_entries frei ist. createDialogue fängt trotzdem Postgres-Code
// 23505 ab (kleines TOCTOU-Restrisiko bei zeitgleichen identischen Titeln).
export async function generateUniqueDialogueSlug(title: string): Promise<string> {
  const base = slugifyBase(title);
  let candidate = base;
  let n = 2;

  for (;;) {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM archive_entries WHERE slug = ${candidate}) AS exists
    `;
    if (!row.exists) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

export interface DialogueMessage {
  id: number;
  characterId: number | null;
  characterSlug: string | null;
  characterName: string | null;
  content: string;
  createdAt: string;
}

// Absteigend (neueste zuerst). Kein unstable_cache — muss nach jeder neuen
// Nachricht sofort frisch sein (Server Actions revalidieren die Seite
// gezielt, siehe src/app/actions/dialogues.ts).
export async function getDialogueMessages(
  archiveEntryId: number,
): Promise<DialogueMessage[]> {
  const rows = await sql<
    {
      id: number;
      character_id: number | null;
      character_slug: string | null;
      character_name: string | null;
      content: string;
      created_at: string;
    }[]
  >`
    SELECT
      dm.id, dm.character_id,
      c.slug AS character_slug, c.name AS character_name,
      dm.content, dm.created_at::text AS created_at
    FROM dialogue_messages dm
    LEFT JOIN characters c ON c.id = dm.character_id
    WHERE dm.archive_entry_id = ${archiveEntryId}
    ORDER BY dm.created_at DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    characterId: r.character_id,
    characterSlug: r.character_slug,
    characterName: r.character_name,
    content: r.content,
    createdAt: r.created_at,
  }));
}

export interface CreateDialogueInput {
  title: string;
  ownCharacterId: number;
  partnerCharacterId: number;
  authorUserId: number;
  setting: string | null;
  locationSlug: string | null;
  logDate: string | null;
  tags: string[];
  bodyMarkdown: string;
}

// Der Dialog selbst ist ein ganz normaler archive_entries-Eintrag der
// Kategorie 'dialogue' — gleiche metadata-Form wie Vault-Dialoge
// (participants/location/logDate/setting), damit DialogueHeader ihn
// unverändert genauso rendert. content bleibt '' und source_md NULL
// (Unterscheidungsmerkmal "kommt nicht aus dem Vault"); die eigentliche
// erste Nachricht landet in dialogue_messages.
export async function createDialogue(
  input: CreateDialogueInput,
): Promise<{ slug: string }> {
  const slug = await generateUniqueDialogueSlug(input.title);

  return sql.begin(async (tx) => {
    const [ownChar] = await tx<{ slug: string; name: string }[]>`
      SELECT slug, name FROM characters WHERE id = ${input.ownCharacterId}
    `;
    const [partnerChar] = await tx<{ slug: string; name: string }[]>`
      SELECT slug, name FROM characters WHERE id = ${input.partnerCharacterId}
    `;
    if (!ownChar || !partnerChar) {
      throw new Error("Charakter nicht gefunden.");
    }

    let location: ArchiveLocationRef | null = null;
    if (input.locationSlug) {
      const [loc] = await tx<{ title: string }[]>`
        SELECT title FROM archive_entries
        WHERE slug = ${input.locationSlug} AND category = 'location'
      `;
      if (loc) location = { slug: input.locationSlug, title: loc.title };
    }

    const participants: ArchiveParticipant[] = [
      { slug: ownChar.slug, name: ownChar.name, kind: "character" },
      { slug: partnerChar.slug, name: partnerChar.name, kind: "character" },
    ];

    const metadata = {
      summary: null,
      attributes: [],
      characters: [],
      missions: [],
      setting: input.setting,
      logDate: input.logDate,
      participants,
      location,
    };

    try {
      const [entry] = await tx<{ id: number }[]>`
        INSERT INTO archive_entries (
          slug, title, category, content, tags, metadata,
          source_md, frontmatter, updated_at
        ) VALUES (
          ${slug}, ${input.title}, 'dialogue', '', ${input.tags},
          ${tx.json(metadata as ReturnType<typeof JSON.parse>)}, NULL, ${tx.json({})}, NOW()
        )
        RETURNING id
      `;

      const content = await markdownToSafeHtml(input.bodyMarkdown);
      await tx`
        INSERT INTO dialogue_messages (
          archive_entry_id, character_id, author_user_id, content, source_md
        ) VALUES (
          ${entry.id}, ${input.ownCharacterId}, ${input.authorUserId},
          ${content}, ${input.bodyMarkdown}
        )
      `;

      return { slug };
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DialogueSlugCollisionError(
          "Ein Dialog mit diesem Titel wurde gerade schon angelegt. Bitte versuche es erneut.",
        );
      }
      throw err;
    }
  });
}

export interface PostMessageInput {
  archiveEntryId: number;
  characterId: number;
  authorUserId: number;
  bodyMarkdown: string;
}

export async function postDialogueMessage(
  input: PostMessageInput,
): Promise<DialogueMessage> {
  const content = await markdownToSafeHtml(input.bodyMarkdown);

  return sql.begin(async (tx) => {
    const [row] = await tx<
      { id: number; character_id: number | null; created_at: string }[]
    >`
      INSERT INTO dialogue_messages (
        archive_entry_id, character_id, author_user_id, content, source_md
      ) VALUES (
        ${input.archiveEntryId}, ${input.characterId}, ${input.authorUserId},
        ${content}, ${input.bodyMarkdown}
      )
      RETURNING id, character_id, created_at::text AS created_at
    `;

    // Hält getDialoguesForUser()s Sortierung nach Aktivität sinnvoll.
    await tx`
      UPDATE archive_entries SET updated_at = NOW() WHERE id = ${input.archiveEntryId}
    `;

    const [char] = await tx<{ slug: string; name: string }[]>`
      SELECT slug, name FROM characters WHERE id = ${input.characterId}
    `;

    return {
      id: row.id,
      characterId: row.character_id,
      characterSlug: char?.slug ?? null,
      characterName: char?.name ?? null,
      content,
      createdAt: row.created_at,
    };
  });
}

export interface DialogueParticipantInfo {
  characterId: number;
  characterSlug: string;
  characterName: string;
}

// Ist userId Inhaber eines der beiden Teilnehmer-Charaktere dieses
// Dialogs? Grundlage für den client-seitigen (nicht redirectenden) Check
// UND die serverseitige Autorisierung vor jedem Insert.
export async function getDialogueParticipant(
  archiveEntryId: number,
  userId: number,
): Promise<DialogueParticipantInfo | null> {
  const [entry] = await sql<{ metadata: unknown }[]>`
    SELECT metadata FROM archive_entries WHERE id = ${archiveEntryId}
  `;
  if (!entry) return null;

  const slugs = parseParticipants(entry.metadata).map((p) => p.slug);
  if (slugs.length === 0) return null;

  const [row] = await sql<{ id: number; slug: string; name: string }[]>`
    SELECT id, slug, name FROM characters
    WHERE slug = ANY(${slugs}) AND player_id = ${userId}
    LIMIT 1
  `;
  if (!row) return null;

  return { characterId: row.id, characterSlug: row.slug, characterName: row.name };
}

export interface DialogueEmailTarget {
  email: string;
  name: string;
}

// Owner des JEWEILS ANDEREN Teilnehmer-Charakters (aktuelle player_id, nicht
// der Autor-Snapshot in dialogue_messages) — null falls dieser Charakter
// aktuell niemandem zugeordnet ist (Mail entfällt dann still).
export async function getOtherParticipantContact(
  archiveEntryId: number,
  excludeCharacterSlug: string,
): Promise<DialogueEmailTarget | null> {
  const [entry] = await sql<{ metadata: unknown }[]>`
    SELECT metadata FROM archive_entries WHERE id = ${archiveEntryId}
  `;
  if (!entry) return null;

  const other = parseParticipants(entry.metadata).find(
    (p) => p.slug !== excludeCharacterSlug,
  );
  if (!other) return null;

  const [row] = await sql<{ email: string; name: string }[]>`
    SELECT u.email, u.name
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.slug = ${other.slug} AND c.player_id IS NOT NULL
    LIMIT 1
  `;
  return row ?? null;
}

export interface DialogueSummary {
  slug: string;
  title: string;
  partnerName: string;
  updatedAt: string;
}

// "Deine Gespräche" fürs Dashboard. Fragt pro eigenem Charakter einzeln ab
// (gleiches jsonb-Containment-Muster wie getDialogueCountByParticipant in
// src/lib/archive.ts) statt eines komplexeren Multi-Charakter-JOINs — bei
// der üblichen Anzahl Charaktere pro Spieler unproblematisch, und deutlich
// weniger fehleranfällig als jsonb_build_object direkt in SQL zu bauen.
export async function getDialoguesForUser(
  userId: number,
): Promise<DialogueSummary[]> {
  const ownCharacters = await getCharactersForUser(userId);
  if (ownCharacters.length === 0) return [];
  const ownSlugs = new Set(ownCharacters.map((c) => c.slug));

  const results = new Map<string, DialogueSummary>();
  for (const slug of ownSlugs) {
    const rows = await sql<
      { slug: string; title: string; metadata: unknown; updated_at: string }[]
    >`
      SELECT slug, title, metadata, updated_at::text AS updated_at
      FROM archive_entries
      WHERE category = 'dialogue'
        AND metadata->'participants' @> ${sql.json([{ slug }])}
    `;

    for (const row of rows) {
      if (results.has(row.slug)) continue;
      const partner = parseParticipants(row.metadata).find(
        (p) => !ownSlugs.has(p.slug),
      );
      results.set(row.slug, {
        slug: row.slug,
        title: row.title,
        partnerName: partner?.name ?? "Unbekannt",
        updatedAt: row.updated_at,
      });
    }
  }

  return [...results.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
