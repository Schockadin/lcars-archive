import sql from "@/lib/db";
import {
  MissionLogItem,
  MissionMetaData,
  MissionPreview,
} from "@/types/missions";

// metadata kommt als JSONB-String aus der DB — wie bei den Charakteren
// (vgl. parseCharacter) muss sie zum Objekt geparst werden.
function parseMissionRow(row: MissionPreview): MissionPreview {
  return {
    ...row,
    metadata:
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as MissionMetaData)
        : row.metadata,
  };
}

// Alle Missionen für die Chronik — neueste zuerst.
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
  return rows.map(parseMissionRow);
}

// Alle Mission-Logs auf einmal — die Chronik lädt sie vorab und
// gruppiert sie clientseitig pro Mission, damit der Wechsel beim
// Anklicken einer Mission ohne Nachladen/Spinner erfolgt.
export async function getAllMissionLogs(): Promise<MissionLogItem[]> {
  const rows = await sql<MissionLogItem[]>`
    SELECT
      ml.id,
      ml.slug,
      ml.title,
      ml.session_nr,
      ml.log_date::text AS log_date,
      ml.mission_id,
      m.slug AS mission_slug,
      ml.author_id,
      c.name AS author_name,
      c.slug AS author_slug,
      ml.content
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    LEFT JOIN characters c ON c.id = ml.author_id
    ORDER BY ml.session_nr DESC NULLS LAST, ml.created_at DESC
  `;
  return rows;
}
