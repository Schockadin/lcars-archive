import { cache } from "react";
import sql from "@/lib/db";
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
export async function getAllMissions(): Promise<MissionPreview[]> {
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
}

// Eine Mission per Slug. cache() dedupliziert den Aufruf innerhalb eines
// Requests (Layout + Page fragen dieselbe Mission ab).
export const getMissionBySlug = cache(
  async (slug: string): Promise<MissionDetail | null> => {
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
);

// Logs einer Mission (schlank, ohne content) für die Liste links.
export const getLogsByMissionId = cache(
  async (missionId: number): Promise<MissionLogListItem[]> => {
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
);

// Ein vollständiges Log per Slug (global eindeutig) inkl. Mission-Referenz.
export async function getLogBySlug(
  slug: string,
): Promise<MissionLogDetail | null> {
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
}

// Alle Mission-/Log-Pfade für die Sitemap.
export async function getAllLogPaths(): Promise<LogPath[]> {
  const rows = await sql<LogPath[]>`
    SELECT
      m.slug  AS mission_slug,
      ml.slug AS log_slug,
      ml.updated_at::text AS updated_at
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
  `;
  return rows;
}
