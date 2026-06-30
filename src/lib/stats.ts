import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";

export interface HeaderStats {
  characterCount: number;
  sessionCount: number;
  entryCount: number;
  dialogueCount: number;
  factionCount: number;
  itemCount: number;
  loreCount: number;
  npcCount: number;
  locationCount: number;
  speciesCount: number;
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
          dialogue_count: string;
          faction_count: string;
          item_count: string;
          lore_count: string;
          npc_count: string;
          location_count: string;
          species_count: string;
        },
      ]
    >`
      SELECT
        (SELECT COUNT(*) FROM characters)     AS character_count,
        (SELECT COUNT(*) FROM mission_logs)   AS session_count,
        (SELECT COUNT(*) FROM archive_entries) AS entry_count,
        (SELECT COUNT(*) FROM archive_entries WHERE category = 'dialogue') AS dialogue_count,
        (SELECT COUNT(*) FROM archive_entries WHERE category = 'faction') AS faction_count,
        (SELECT COUNT(*) FROM archive_entries WHERE category = 'item') AS item_count,
        (SELECT COUNT(*) FROM archive_entries WHERE category = 'lore') AS lore_count,
        (SELECT COUNT(*) FROM archive_entries WHERE category = 'npc') AS npc_count,
        (SELECT COUNT(*) FROM archive_entries WHERE category = 'location') AS location_count,
        (SELECT COUNT(*) FROM archive_entries WHERE category = 'species') AS species_count
    `;

    return {
      characterCount: parseInt(counts.character_count),
      sessionCount: parseInt(counts.session_count),
      entryCount: parseInt(counts.entry_count),
      dialogueCount: parseInt(counts.dialogue_count),
      factionCount: parseInt(counts.faction_count),
      itemCount: parseInt(counts.item_count),
      loreCount: parseInt(counts.lore_count),
      npcCount: parseInt(counts.npc_count),
      locationCount: parseInt(counts.location_count),
      speciesCount: parseInt(counts.species_count),
    };
  },
  ["getDBStats"],
  { tags: [cacheTags.stats, cacheTags.characters, cacheTags.missionLogs] },
);
