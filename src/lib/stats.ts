import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";

export interface HeaderStats {
  characterCount: number;
  sessionCount: number;
  entryCount: number;
}

// Kennzahlen für den Header/die Landing-Page. Zwei COUNT-lastige Queries —
// daher persistent gecacht und an stats + characters + mission-logs getaggt
// (zählt Charaktere und Sessions), damit die Werte bei Mutationen frisch werden.
export const getDBStats = unstable_cache(
  async (): Promise<HeaderStats> => {
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

    return {
      characterCount: parseInt(counts.character_count),
      sessionCount: parseInt(counts.session_count),
      entryCount: parseInt(counts.entry_count),
    };
  },
  ["getDBStats"],
  { tags: [cacheTags.stats, cacheTags.characters, cacheTags.missionLogs] },
);
