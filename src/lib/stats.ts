import { cacheTag, cacheLife } from "next/cache";
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
//
// Nur ÖFFENTLICHE, nicht-Entwurf-Inhalte werden gezählt: die Kennzahlen stehen
// auf der öffentlichen Landing-Page („Aktueller Datenbestand") und verlinken
// auf /characters, /chronologie, /archive, die anonymen Besuchern ebenfalls nur
// veröffentlichte Inhalte zählen. Ein cache-weiter Einzelwert kann ohnehin
// nicht betrachterabhängig sein — die veröffentlichte Zahl ist die einzige,
// die zur verlinkten Liste passt und nicht verrät, wie viele Entwürfe es gibt
// (dieselbe Grenze wie die Suche in src/lib/search.ts).
export async function getDBStats(): Promise<HeaderStats> {
  "use cache";
  cacheTag(cacheTags.stats, cacheTags.characters, cacheTags.missionLogs);
  cacheLife("max");
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
        (SELECT COUNT(*) FROM characters
          WHERE deleted_at IS NULL AND is_draft = false)   AS character_count,
        (SELECT COUNT(*) FROM mission_logs
          WHERE deleted_at IS NULL AND is_draft = false)   AS session_count,
        (SELECT COUNT(*) FROM archive_entries
          WHERE NOT (category = 'dialogue' AND dialogue_open)
            AND deleted_at IS NULL AND is_draft = false)   AS entry_count
    `;

  return {
    characterCount: parseInt(counts.character_count),
    sessionCount: parseInt(counts.session_count),
    entryCount: parseInt(counts.entry_count),
  };
}
