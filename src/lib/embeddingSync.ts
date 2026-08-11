// Bindeglied zwischen den Content-Mutationen (Server Actions bzw. die
// Daten-Layer-Funktionen in src/lib/*.ts) und der reinen Embedding-Logik in
// src/lib/embeddings.ts.
//
// Hier lebt das, was embeddings.ts bewusst NICHT kennt: das typabhängige
// Nachladen eines Inhalts aus der DB (inkl. der Joins für die Header —
// Mission-Titel, Autor-Name, Teilnehmer) und die daraus abgeleiteten,
// denormalisierten RBAC-Felder (visibility/owner/is_draft/is_active).
//
// Zwei Nutzergruppen:
//   - Fire-and-forget-Trigger aus den Content-Mutationen (syncEmbeddings /
//     purgeEmbeddings / syncEmbeddingVisibility / syncEmbeddingActive): nutzen
//     den globalen sql-Client, werfen nie in den Aufrufer zurück (Fehler nur
//     geloggt), und überspringen still, solange OPENAI_API_KEY fehlt — genau
//     wie sendEmail/sendPush ohne Key. Der Backfill (scripts/embed-all.ts) ist
//     das Sicherheitsnetz, falls ein Fire-and-forget-Lauf (z.B. serverless)
//     abbricht.
//   - Der Backfill selbst: ruft embedOne()/listEmbeddableTargets() mit einem
//     eigenen Client auf.
//
// Bewusst OHNE „server-only", damit scripts/embed-all.ts (tsx) es importieren
// kann (gleiche Linie wie embeddings.ts / mailCore.ts).

import sql from "@/lib/db";
import { stripHtml } from "@/lib/missionFormat";
import type { Visibility } from "@/lib/visibility";
import {
  chunkContent,
  embedTexts,
  upsertEmbeddings,
  deleteEmbeddings,
  updateEmbeddingVisibility,
  updateEmbeddingActive,
  updateEmbeddingOwner,
  hasEmbeddingConfig,
  type EmbeddingContentType,
  type ChunkInput,
  type SqlClient,
} from "@/lib/embeddings";

interface FetchedRecord {
  chunkInput: ChunkInput;
  visibility: Visibility;
  ownerId: number | null;
  isDraft: boolean;
  isActive: boolean;
  title: string | null;
  slug: string | null;
  href: string | null;
}

// Lädt einen einzelnen Inhalt in der Form, die embeddings.chunkContent() +
// upsertEmbeddings() brauchen. null, wenn die Zeile nicht (mehr) existiert —
// der Aufrufer räumt dann die Embeddings ab.
async function fetchRecord(
  client: SqlClient,
  contentType: EmbeddingContentType,
  contentId: number,
): Promise<FetchedRecord | null> {
  switch (contentType) {
    case "character": {
      const [row] = await client<
        {
          slug: string;
          name: string;
          species: string | null;
          rank: string | null;
          status: string | null;
          bio: string | null;
          source_md: string | null;
          visibility: Visibility;
          player_id: number | null;
          is_draft: boolean;
          deleted_at: Date | null;
        }[]
      >`
        SELECT slug, name, species, rank, status, bio, source_md,
               visibility, player_id, is_draft, deleted_at
        FROM characters WHERE id = ${contentId}
      `;
      if (!row) return null;
      return {
        chunkInput: {
          type: "character",
          record: {
            name: row.name,
            species: row.species,
            rank: row.rank,
            status: row.status,
            sourceMd: row.source_md,
            fallbackText: row.bio,
          },
        },
        visibility: row.visibility,
        ownerId: row.player_id,
        isDraft: row.is_draft,
        isActive: row.deleted_at == null,
        title: row.name,
        slug: row.slug,
        href: `/characters/${row.slug}`,
      };
    }
    case "mission": {
      const [row] = await client<
        {
          slug: string;
          title: string;
          status: string | null;
          started_at: string | null;
          ended_at: string | null;
          source_md: string | null;
          owner_user_id: number | null;
          is_draft: boolean;
          deleted_at: Date | null;
        }[]
      >`
        SELECT slug, title, status, started_at::text, ended_at::text,
               source_md, owner_user_id, is_draft, deleted_at
        FROM missions WHERE id = ${contentId}
      `;
      if (!row) return null;
      return {
        chunkInput: {
          type: "mission",
          record: {
            title: row.title,
            status: row.status,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            sourceMd: row.source_md,
          },
        },
        // Missionen sind immer public (siehe scripts/schema.sql).
        visibility: "public",
        ownerId: row.owner_user_id,
        isDraft: row.is_draft,
        isActive: row.deleted_at == null,
        title: row.title,
        slug: row.slug,
        href: `/missions/${row.slug}`,
      };
    }
    case "mission_log": {
      const [row] = await client<
        {
          slug: string;
          title: string;
          content: string | null;
          source_md: string | null;
          session_nr: number | null;
          log_date: string | null;
          visibility: Visibility;
          owner_user_id: number | null;
          is_draft: boolean;
          deleted_at: Date | null;
          mission_slug: string;
          mission_title: string;
          author_name: string | null;
        }[]
      >`
        SELECT ml.slug, ml.title, ml.content, ml.source_md, ml.session_nr,
               ml.log_date::text, ml.visibility, ml.owner_user_id, ml.is_draft,
               ml.deleted_at, m.slug AS mission_slug, m.title AS mission_title,
               ch.name AS author_name
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        LEFT JOIN characters ch ON ch.id = ml.author_id
        WHERE ml.id = ${contentId}
      `;
      if (!row) return null;
      return {
        chunkInput: {
          type: "mission_log",
          record: {
            title: row.title,
            missionTitle: row.mission_title,
            authorName: row.author_name,
            sessionNr: row.session_nr,
            logDate: row.log_date,
            sourceMd: row.source_md,
            fallbackText: row.content ? stripHtml(row.content) : null,
          },
        },
        visibility: row.visibility,
        ownerId: row.owner_user_id,
        isDraft: row.is_draft,
        isActive: row.deleted_at == null,
        title: row.title,
        slug: row.slug,
        href: `/missions/${row.mission_slug}/${row.slug}`,
      };
    }
    case "archive_entry": {
      // Dialoge sind ein eigener content_type (unten) — hier bewusst
      // ausgeschlossen.
      const [row] = await client<
        {
          slug: string;
          title: string;
          category: string;
          content: string | null;
          source_md: string | null;
          setting: string | null;
          visibility: Visibility;
          owner_user_id: number | null;
          is_draft: boolean;
          deleted_at: Date | null;
        }[]
      >`
        SELECT slug, title, category, content, source_md,
               metadata->>'setting' AS setting,
               visibility, owner_user_id, is_draft, deleted_at
        FROM archive_entries
        WHERE id = ${contentId} AND category <> 'dialogue'
      `;
      if (!row) return null;
      return {
        chunkInput: {
          type: "archive_entry",
          record: {
            title: row.title,
            category: row.category,
            setting: row.setting,
            sourceMd: row.source_md,
            fallbackText: row.content ? stripHtml(row.content) : null,
          },
        },
        visibility: row.visibility,
        ownerId: row.owner_user_id,
        isDraft: row.is_draft,
        isActive: row.deleted_at == null,
        title: row.title,
        slug: row.slug,
        href: `/archive/${row.slug}`,
      };
    }
    case "dialogue": {
      // Nur ABGESCHLOSSENE Dialoge (dialogue_open = false) haben einen
      // aggregierten Fließtext (content/source_md, siehe
      // regenerateDialogueContent) — offene Dialoge werden nicht embedded.
      const [row] = await client<
        {
          slug: string;
          title: string;
          content: string | null;
          source_md: string | null;
          setting: string | null;
          participants: { name?: string }[] | null;
          visibility: Visibility;
          owner_user_id: number | null;
          is_draft: boolean;
          deleted_at: Date | null;
        }[]
      >`
        SELECT slug, title, content, source_md,
               metadata->>'setting' AS setting,
               metadata->'participants' AS participants,
               visibility, owner_user_id, is_draft, deleted_at
        FROM archive_entries
        WHERE id = ${contentId} AND category = 'dialogue'
          AND dialogue_open = FALSE
      `;
      if (!row) return null;
      const participants = Array.isArray(row.participants)
        ? row.participants
            .map((p) => (p && typeof p.name === "string" ? p.name : null))
            .filter((n): n is string => n != null)
        : [];
      return {
        chunkInput: {
          type: "dialogue",
          record: {
            title: row.title,
            setting: row.setting,
            participants,
            sourceMd: row.source_md,
            fallbackText: row.content ? stripHtml(row.content) : null,
          },
        },
        visibility: row.visibility,
        ownerId: row.owner_user_id,
        isDraft: row.is_draft,
        isActive: row.deleted_at == null,
        title: row.title,
        slug: row.slug,
        href: `/archive/${row.slug}`,
      };
    }
  }
}

export type EmbedOutcome = "embedded" | "removed" | "skipped";

// Kern: einen Inhalt (neu) embedden und in content_embeddings schreiben.
// Existiert die Zeile nicht mehr oder hat sie keinen verwertbaren Text, werden
// evtl. vorhandene Embeddings entfernt. Nutzt einen übergebenen Client (App:
// globaler sql; Backfill: eigener). Ruft OpenAI — der Aufrufer stellt sicher,
// dass ein Key gesetzt ist (hasEmbeddingConfig) bzw. fängt den Fehler ab.
export async function embedOne(
  client: SqlClient,
  contentType: EmbeddingContentType,
  contentId: number,
): Promise<EmbedOutcome> {
  const rec = await fetchRecord(client, contentType, contentId);
  if (!rec) {
    await deleteEmbeddings(client, contentType, contentId);
    return "removed";
  }
  const chunks = chunkContent(rec.chunkInput);
  if (chunks.length === 0) {
    await deleteEmbeddings(client, contentType, contentId);
    return "removed";
  }
  const vectors = await embedTexts(chunks.map((c) => c.text));
  const embedded = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
  await upsertEmbeddings(client, {
    contentType,
    contentId,
    chunks: embedded,
    visibility: rec.visibility,
    ownerId: rec.ownerId,
    isDraft: rec.isDraft,
    isActive: rec.isActive,
    title: rec.title,
    slug: rec.slug,
    href: rec.href,
  });
  return "embedded";
}

// --- Ziel-Enumeration für den Backfill ------------------------------------

export interface EmbedTarget {
  contentType: EmbeddingContentType;
  contentId: number;
}

// Alle embedding-fähigen Inhalte (auch Entwürfe/soft-deleted — deren
// denormalisierte Flags sorgen dafür, dass die Suche sie später ausblendet).
// Dialoge nur abgeschlossen; Archiv-Einträge ohne Dialoge.
export async function listEmbeddableTargets(
  client: SqlClient,
): Promise<EmbedTarget[]> {
  const [characters, missions, logs, archive, dialogues] = await Promise.all([
    client<{ id: number }[]>`SELECT id FROM characters ORDER BY id`,
    client<{ id: number }[]>`SELECT id FROM missions ORDER BY id`,
    client<{ id: number }[]>`SELECT id FROM mission_logs ORDER BY id`,
    client<{ id: number }[]>`
      SELECT id FROM archive_entries WHERE category <> 'dialogue' ORDER BY id
    `,
    client<{ id: number }[]>`
      SELECT id FROM archive_entries
      WHERE category = 'dialogue' AND dialogue_open = FALSE ORDER BY id
    `,
  ]);
  return [
    ...characters.map((r) => ({ contentType: "character" as const, contentId: r.id })),
    ...missions.map((r) => ({ contentType: "mission" as const, contentId: r.id })),
    ...logs.map((r) => ({ contentType: "mission_log" as const, contentId: r.id })),
    ...archive.map((r) => ({ contentType: "archive_entry" as const, contentId: r.id })),
    ...dialogues.map((r) => ({ contentType: "dialogue" as const, contentId: r.id })),
  ];
}

// ---------------------------------------------------------------------------
// Fire-and-forget-Trigger (globaler sql-Client)
// ---------------------------------------------------------------------------

// Bewusst nur console.error (kein logCaughtError/errorLog): errorLog.ts zieht
// „server-only" ein, was diese Datei sonst für die per-tsx laufenden Skripte
// (scripts/embed-all.ts, scripts/seedExampleDialogue.ts über dialoguesCore)
// unbrauchbar machen würde. Fire-and-forget-Fehler sind best-effort; der
// Backfill (embed:all) ist das Sicherheitsnetz.
function logEmbeddingError(where: string, err: unknown): void {
  console.error(`Embedding-Sync (${where}) fehlgeschlagen:`, err);
}

// Re-Embedding nach Anlegen/Bearbeiten eines Inhalts. Überspringt still, wenn
// kein OpenAI-Key gesetzt ist (Backfill holt es später nach). Nie awaiten —
// die Mutation soll nicht auf OpenAI warten.
export function syncEmbeddings(
  contentType: EmbeddingContentType,
  contentId: number,
): void {
  if (!hasEmbeddingConfig()) return;
  void embedOne(sql, contentType, contentId).catch((err) =>
    logEmbeddingError(`sync:${contentType}:${contentId}`, err),
  );
}

// Sichtbarkeits-Änderung → nur das denormalisierte Feld nachziehen (kein
// Re-Embedding, kein OpenAI-Key nötig).
export function syncEmbeddingVisibility(
  contentType: EmbeddingContentType,
  contentId: number,
  visibility: Visibility,
): void {
  void updateEmbeddingVisibility(sql, contentType, contentId, visibility).catch(
    (err) => logEmbeddingError(`visibility:${contentType}:${contentId}`, err),
  );
}

// Soft-Delete/Restore → is_active nachziehen (kein OpenAI-Key nötig).
export function syncEmbeddingActive(
  contentType: EmbeddingContentType,
  contentId: number,
  isActive: boolean,
): void {
  void updateEmbeddingActive(sql, contentType, contentId, isActive).catch((err) =>
    logEmbeddingError(`active:${contentType}:${contentId}`, err),
  );
}

// Owner-Wechsel → owner_id nachziehen (kein OpenAI-Key nötig).
export function syncEmbeddingOwner(
  contentType: EmbeddingContentType,
  contentId: number,
  ownerId: number | null,
): void {
  void updateEmbeddingOwner(sql, contentType, contentId, ownerId).catch((err) =>
    logEmbeddingError(`owner:${contentType}:${contentId}`, err),
  );
}

// Bulk-Owner-Reset für alle Charakter-Embeddings einer Person (wird beim
// Herabstufen auf die Gast-Rolle mit-entzogen, siehe
// unassignCharactersFromUser). Setzt owner_id auf NULL, damit der Owner-Bypass
// im RAG-Filter nicht auf dem alten Owner hängen bleibt. Kein OpenAI-Key nötig.
export function syncCharacterEmbeddingsOwnerCleared(userId: number): void {
  void sql`
    UPDATE content_embeddings SET owner_id = NULL, updated_at = NOW()
    WHERE content_type = 'character' AND owner_id = ${userId}
  `.catch((err) => logEmbeddingError(`ownerCleared:${userId}`, err));
}

// Kaskadierte Soft-Delete/Restore einer Mission auf ihre Mission-Logs: setzt
// is_active für ALLE Log-Embeddings dieser Mission in einem Rutsch (die
// einzelnen Log-Ids liegen im Aufrufer nicht vor). Kein OpenAI-Key nötig.
export function syncMissionLogsActiveByMission(
  missionId: number,
  isActive: boolean,
): void {
  void sql`
    UPDATE content_embeddings SET is_active = ${isActive}, updated_at = NOW()
    WHERE content_type = 'mission_log'
      AND content_id IN (SELECT id FROM mission_logs WHERE mission_id = ${missionId})
  `.catch((err) => logEmbeddingError(`missionLogsActive:${missionId}`, err));
}
