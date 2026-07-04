import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { markdownToHtml } from "@/lib/markdown";
import {
  LogNavItem,
  LogNavNeighbors,
  LogPath,
  MissionDetail,
  MissionLogDetail,
  MissionLogListItem,
  MissionMetaData,
  MissionPreview,
} from "@/types/missions";

// metadata kommt als JSONB-String aus der DB — wie bei den Charakteren
// (vgl. parseCharacter) muss sie zum Objekt geparst werden.
function parseMeta<T extends { metadata: MissionMetaData }>(row: T): T {
  return {
    ...row,
    metadata:
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as MissionMetaData)
        : row.metadata,
  };
}

// Alle Missionen für die Übersicht — neueste zuerst.
// Die Anzahl der Mission-Logs wird per LEFT JOIN mitgezählt, damit
// auch Missionen ohne Logs (log_count = 0) erscheinen.
// Persistenter Cache bis zur Tag-Invalidierung (hängt an missions + mission-logs,
// da log_count mitgezählt wird).
export const getAllMissions = unstable_cache(
  async (): Promise<MissionPreview[]> => {
    const rows = await sql<MissionPreview[]>`
      SELECT
        m.id,
        m.slug,
        m.title,
        m.status,
        m.metadata,
        m.started_at::text         AS started_at,
        m.ended_at::text           AS ended_at,
        COUNT(DISTINCT ml.id)::int AS log_count,
        COALESCE(
          jsonb_agg(DISTINCT jsonb_build_object('name', c.name, 'slug', c.slug))
            FILTER (WHERE c.id IS NOT NULL),
          '[]'::jsonb
        ) AS authors
      FROM missions m
      LEFT JOIN mission_logs ml ON ml.mission_id = m.id
      LEFT JOIN characters c    ON c.id = ml.author_id
      GROUP BY m.id
      ORDER BY m.started_at DESC NULLS LAST, m.created_at DESC
    `;
    return rows.map(parseMeta);
  },
  ["getAllMissions"],
  { tags: [cacheTags.missions, cacheTags.missionLogs] },
);

// Eine Mission per Slug. Persistenter Cache, getaggt mit missions + mission:<slug>.
// unstable_cache dedupliziert auch innerhalb eines Requests (Layout + Page
// fragen dieselbe Mission ab), ersetzt also das frühere React-cache().
export async function getMissionBySlug(
  slug: string,
): Promise<MissionDetail | null> {
  return unstable_cache(
    async (): Promise<MissionDetail | null> => {
      const rows = await sql<MissionDetail[]>`
        SELECT
          id,
          slug,
          title,
          status,
          started_at::text AS started_at,
          ended_at::text   AS ended_at,
          metadata,
          updated_at::text AS updated_at,
          owner_user_id    AS "ownerUserId"
        FROM missions
        WHERE slug = ${slug}
        LIMIT 1
      `;
      return rows[0] ? parseMeta(rows[0]) : null;
    },
    ["getMissionBySlug", "v2", slug],
    { tags: [cacheTags.missions, cacheTags.mission(slug)] },
  )();
}

// Vorschlagswert fürs Session-Nr-Feld im "Neuer Missionslog"-Formular
// (src/app/users/[id]/mission-logs/new) — nur ein Default, das Feld bleibt
// editierbar. Kein Cache: soll bei jedem Seitenaufruf den aktuellen Stand
// zeigen, nicht bis zur nächsten Tag-Invalidierung stale bleiben.
export async function getNextSessionNr(
  missionId: number,
  authorId: number,
): Promise<number> {
  const [row] = await sql<{ next: number }[]>`
    SELECT COALESCE(MAX(session_nr), 0) + 1 AS next
    FROM mission_logs
    WHERE mission_id = ${missionId} AND author_id = ${authorId}
  `;
  return row?.next ?? 1;
}

// Kollisionsprüfung vor dem Vault-Commit (src/app/users/[id]/mission-logs/new/actions.ts)
// — der Slug ist deterministisch aus author-mission-session_nr gebaut, ein
// Treffer bedeutet also "diese Kombination gibt es schon".
export async function missionLogSlugExists(slug: string): Promise<boolean> {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM mission_logs WHERE slug = ${slug}) AS exists
  `;
  return row?.exists ?? false;
}

// Logs einer Mission (schlank, ohne content) für die Liste links. Nur
// public — diese Nav-Liste wird auf jeder Log-Detailseite der Mission
// mitgerendert (auch auf privaten/gm-Logs, siehe Layout), ein
// nicht-public Log würde sonst dort für jeden Betrachter im Titel auftauchen.
export async function getLogsByMissionId(
  missionId: number,
): Promise<MissionLogListItem[]> {
  return unstable_cache(
    async (): Promise<MissionLogListItem[]> => {
      const rows = await sql<MissionLogListItem[]>`
        SELECT
          ml.id,
          ml.slug,
          ml.title,
          ml.session_nr,
          ml.log_date::text AS log_date,
          c.name AS author_name,
          c.slug AS author_slug
        FROM mission_logs ml
        LEFT JOIN characters c ON c.id = ml.author_id
        WHERE ml.mission_id = ${missionId} AND ml.visibility = 'public'
        ORDER BY ml.session_nr DESC NULLS LAST, ml.created_at DESC
      `;
      return rows;
    },
    ["getLogsByMissionId", "v2", String(missionId)],
    { tags: [cacheTags.missionLogs, cacheTags.missionLogsOf(missionId)] },
  )();
}

// Ein vollständiges Log per Slug (global eindeutig) inkl. Mission-Referenz.
export async function getLogBySlug(
  slug: string,
): Promise<MissionLogDetail | null> {
  return unstable_cache(
    async (): Promise<MissionLogDetail | null> => {
      const rows = await sql<MissionLogDetail[]>`
        SELECT
          ml.id,
          ml.slug,
          ml.title,
          ml.content,
          ml.session_nr,
          ml.log_date::text AS log_date,
          c.name  AS author_name,
          c.slug  AS author_slug,
          m.id    AS mission_id,
          m.slug  AS mission_slug,
          m.title AS mission_title,
          ml.visibility,
          ml.owner_user_id AS "ownerUserId"
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        LEFT JOIN characters c ON c.id = ml.author_id
        WHERE ml.slug = ${slug}
        LIMIT 1
      `;
      return rows[0] ?? null;
    },
    ["getLogBySlug", "v2", slug],
    { tags: [cacheTags.missionLogs, cacheTags.log(slug)] },
  )();
}

// Vor-/Zurück-Navigation zwischen den Logs desselben Autors. Sortiert
// chronologisch nach Datum → Session-Nr (Logs ohne Datum/Session ans Ende);
// prev = das ältere, next = das neuere Nachbar-Log. Gibt {null,null} zurück,
// wenn der Autor unbekannt ist oder das Log nicht (mehr) zum Autor gehört.
export async function getAuthorLogNav(
  authorSlug: string,
  currentSlug: string,
): Promise<LogNavNeighbors> {
  return unstable_cache(
    async (): Promise<LogNavNeighbors> => {
      const logs = await sql<LogNavItem[]>`
        SELECT
          ml.slug,
          m.slug  AS mission_slug,
          ml.title,
          ml.session_nr,
          ml.log_date::text AS log_date
        FROM mission_logs ml
        JOIN missions m   ON m.id = ml.mission_id
        JOIN characters c ON c.id = ml.author_id
        WHERE c.slug = ${authorSlug}
        ORDER BY ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST, ml.id ASC
      `;

      const i = logs.findIndex((l) => l.slug === currentSlug);
      if (i === -1) return { prev: null, next: null };
      return {
        prev: logs[i - 1] ?? null,
        next: logs[i + 1] ?? null,
      };
    },
    ["getAuthorLogNav", authorSlug, currentSlug],
    { tags: [cacheTags.missionLogs, cacheTags.character(authorSlug)] },
  )();
}

// Nur der Owner (Spieler des Autor-Charakters, via Join — Mission-Logs haben
// kein eigenes direktes user_id-Feld) darf die Sichtbarkeit ändern; ein
// fremdes/gefälschtes id trifft dann einfach 0 Zeilen.
// Admin-Owner-Verwaltung (src/app/actions/owner.ts): anders als
// setMissionLogVisibility unten NICHT auf den aktuellen Owner gescoped —
// die Berechtigungsprüfung (nur admin) passiert ausschließlich in der
// Server Action, hier reicht die ID.
export async function setMissionOwner(
  missionId: number,
  ownerId: number | null,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE missions
    SET owner_user_id = ${ownerId}, updated_at = NOW()
    WHERE id = ${missionId}
    RETURNING slug
  `;
  return rows[0] ?? null;
}

// Siehe setMissionOwner oben — gleiches Prinzip für Mission-Logs.
export async function setMissionLogOwner(
  logId: number,
  ownerId: number | null,
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<{ slug: string; missionId: number }[]>`
    UPDATE mission_logs
    SET owner_user_id = ${ownerId}, updated_at = NOW()
    WHERE id = ${logId}
    RETURNING slug, mission_id AS "missionId"
  `;
  return rows[0] ?? null;
}

export async function setMissionLogVisibility(
  userId: number,
  logId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<{ slug: string; missionId: number }[]>`
    UPDATE mission_logs ml
    SET visibility = ${visibility}, updated_at = NOW()
    FROM characters c
    WHERE ml.id = ${logId} AND c.id = ml.author_id AND c.player_id = ${userId}
    RETURNING ml.slug, ml.mission_id AS "missionId"
  `;
  return rows[0] ?? null;
}

export interface OwnMissionLogForEdit {
  id: number;
  title: string;
  logDate: string | null;
  sessionNr: number | null;
  sourceMarkdown: string;
  missionSlug: string;
  missionTitle: string;
  authorName: string;
}

// Für /users/[id]/mission-logs/[logId]/edit — lädt den rohen Markdown-Body
// (source_md) statt content (gerendertes HTML), damit das Formular ihn
// wieder editierbar vorbefüllen kann. Gleiche Owner-Prüfung wie
// setMissionLogVisibility (Spieler des Autor-Charakters).
export async function getOwnMissionLogForEdit(
  userId: number,
  logId: number,
): Promise<OwnMissionLogForEdit | null> {
  const rows = await sql<OwnMissionLogForEdit[]>`
    SELECT
      ml.id,
      ml.title,
      ml.log_date::text AS "logDate",
      ml.session_nr AS "sessionNr",
      COALESCE(ml.source_md, '') AS "sourceMarkdown",
      m.slug AS "missionSlug",
      m.title AS "missionTitle",
      c.name AS "authorName"
    FROM mission_logs ml
    JOIN characters c ON c.id = ml.author_id
    JOIN missions m ON m.id = ml.mission_id
    WHERE ml.id = ${logId} AND c.player_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Bearbeitet Titel/Datum/Text eines eigenen Logs direkt in der DB — anders
// als bei der Ersterstellung (mission-logs/new, Commit ins Vault) wird hier
// NICHT erneut committet. Gleiches Prinzip wie schon bei visibility (auch
// dort rein DB-seitig, kein Vault-Feld): Slug-bildende Felder (author,
// mission, session_nr) bleiben unveränderlich, nur Inhalt/Titel/Datum sind
// editierbar. ACHTUNG: ein späterer manueller VOLLER Reingest
// (npm run db:ingest, nicht :new) würde title/content/log_date wieder auf
// den Vault-Stand zurücksetzen (siehe ON CONFLICT DO UPDATE in
// scripts/ingest/missionLogs.ts) — bewusst hingenommener Trade-off, exakt
// wie im Design-Dokument für Vault-Edits beschrieben.
export async function updateMissionLogContent(
  userId: number,
  logId: number,
  input: { title: string; logDate: string | null; bodyMarkdown: string },
): Promise<{ slug: string; missionId: number } | null> {
  const contentHtml = await markdownToHtml(input.bodyMarkdown);

  const rows = await sql<{ slug: string; missionId: number }[]>`
    UPDATE mission_logs ml
    SET
      title      = ${input.title},
      log_date   = ${input.logDate},
      content    = ${contentHtml},
      source_md  = ${input.bodyMarkdown},
      updated_at = NOW()
    FROM characters c
    WHERE ml.id = ${logId} AND c.id = ml.author_id AND c.player_id = ${userId}
    RETURNING ml.slug, ml.mission_id AS "missionId"
  `;
  return rows[0] ?? null;
}

// Löscht ein eigenes Log aus der DB und räumt den zugehörigen
// timeline_events-Eintrag mit auf (der ist nur per source_type/source_slug,
// nicht per FK verknüpft — bliebe sonst als toter Link stehen, siehe
// src/lib/timeline.ts). Gibt zusätzlich missionSlug zurück, damit der
// Aufrufer (Server Action) versuchen kann, die zugehörige Vault-Datei
// ebenfalls zu löschen (Best-Effort, siehe deleteVaultFile in
// src/lib/githubVault.ts — der Dateiname im Vault muss nicht zwingend dem
// Slug entsprechen, v.a. bei älteren, manuell von der Spielleitung
// angelegten Logs).
export async function deleteMissionLog(
  userId: number,
  logId: number,
): Promise<{ slug: string; missionSlug: string; missionId: number } | null> {
  const rows = await sql<
    { slug: string; missionSlug: string; missionId: number }[]
  >`
    DELETE FROM mission_logs ml
    USING characters c, missions m
    WHERE ml.id = ${logId}
      AND c.id = ml.author_id AND c.player_id = ${userId}
      AND m.id = ml.mission_id
    RETURNING ml.slug, m.slug AS "missionSlug", ml.mission_id AS "missionId"
  `;
  const row = rows[0] ?? null;
  if (row) {
    await sql`
      DELETE FROM timeline_events
      WHERE source_type = 'mission_log' AND source_slug = ${row.slug}
    `;
  }
  return row;
}

// Alle Mission-/Log-Pfade für die Sitemap und generateStaticParams. Nur
// public, damit private/gm-Logs nicht statisch vorgerendert oder
// gesitemappt werden (Laufzeit-Guard auf der Detailseite übernimmt sie).
export const getAllLogPaths = unstable_cache(
  async (): Promise<LogPath[]> => {
    const rows = await sql<LogPath[]>`
      SELECT
        m.slug  AS mission_slug,
        ml.slug AS log_slug,
        ml.updated_at::text AS updated_at
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id
      WHERE ml.visibility = 'public'
    `;
    return rows;
  },
  ["getAllLogPaths", "v2"],
  { tags: [cacheTags.missionLogs] },
);
