import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import {
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
        m.summary,
        m.metadata,
        m.started_at::text AS started_at,
        m.ended_at::text   AS ended_at,
        COUNT(ml.id)::int  AS log_count
      FROM missions m
      LEFT JOIN mission_logs ml ON ml.mission_id = m.id
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
          summary,
          started_at::text AS started_at,
          ended_at::text   AS ended_at,
          metadata,
          updated_at::text AS updated_at
        FROM missions
        WHERE slug = ${slug}
        LIMIT 1
      `;
      return rows[0] ? parseMeta(rows[0]) : null;
    },
    ["getMissionBySlug", slug],
    { tags: [cacheTags.missions, cacheTags.mission(slug)] },
  )();
}

// Logs einer Mission (schlank, ohne content) für die Liste links.
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
        WHERE ml.mission_id = ${missionId}
        ORDER BY ml.session_nr DESC NULLS LAST, ml.created_at DESC
      `;
      return rows;
    },
    ["getLogsByMissionId", String(missionId)],
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
          m.title AS mission_title
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        LEFT JOIN characters c ON c.id = ml.author_id
        WHERE ml.slug = ${slug}
        LIMIT 1
      `;
      return rows[0] ?? null;
    },
    ["getLogBySlug", slug],
    { tags: [cacheTags.missionLogs, cacheTags.log(slug)] },
  )();
}

// Alle Mission-/Log-Pfade für die Sitemap und generateStaticParams.
export const getAllLogPaths = unstable_cache(
  async (): Promise<LogPath[]> => {
    const rows = await sql<LogPath[]>`
      SELECT
        m.slug  AS mission_slug,
        ml.slug AS log_slug,
        ml.updated_at::text AS updated_at
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id
    `;
    return rows;
  },
  ["getAllLogPaths"],
  { tags: [cacheTags.missionLogs] },
);
