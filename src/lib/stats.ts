import sql from "@/lib/db";

export interface HeaderStats {
  characterCount: number;
  sessionCount: number;
  entryCount: number;
  lastSession: {
    sessionNr: number | null;
    title: string | null;
    authorName: string | null;
    logDate: string | null;
  } | null;
}

export async function getHeaderStats(): Promise<HeaderStats> {
  const [counts] = await sql<
    [
      {
        character_count: string;
        session_count: string;
        entry_count: string;
      },
    ]
  >`
    SELECT
      (SELECT COUNT(*) FROM characters)     AS character_count,
      (SELECT COUNT(*) FROM mission_logs)   AS session_count,
      (SELECT COUNT(*) FROM archive_entries) AS entry_count
  `;

  const lastSessionRows = await sql<
    {
      session_nr: number | null;
      title: string;
      author_name: string | null;
      log_date: string | null;
    }[]
  >`
    SELECT
      ml.session_nr,
      ml.title,
      c.name AS author_name,
      ml.log_date::text AS log_date
    FROM mission_logs ml
    LEFT JOIN characters c ON c.id = ml.author_id
    ORDER BY ml.session_nr DESC NULLS LAST, ml.created_at DESC
    LIMIT 1
  `;

  return {
    characterCount: parseInt(counts.character_count),
    sessionCount: parseInt(counts.session_count),
    entryCount: parseInt(counts.entry_count),
    lastSession: lastSessionRows[0]
      ? {
          sessionNr: lastSessionRows[0].session_nr,
          title: lastSessionRows[0].title,
          authorName: lastSessionRows[0].author_name,
          logDate: lastSessionRows[0].log_date,
        }
      : null,
  };
}
