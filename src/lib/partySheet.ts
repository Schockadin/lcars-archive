import "server-only";
import sql from "@/lib/db";
import { parseCharacterStats, computeStress } from "@/lib/characterStats";
import { parseTalentEntry } from "@/lib/talentCatalog";
import type { CharacterStats } from "@/types/characterStats";

// Das Gruppenblatt: die Werte aller Spielercharaktere nebeneinander.
//
// Am Tisch braucht die Spielleitung genau diese Tabelle — wer hat welche
// Disziplin, wie viel Schutz, wie viel Stress hält wer aus. Bisher musste
// man dafür jede Charakterseite einzeln öffnen.
//
// Nur zugewiesene, aktive Charaktere: NPCs (ohne player_id) und
// zurückgezogene Akten gehören nicht an den Tisch. Entwürfe ebenso wenig —
// sie sind noch nicht fertig.

export interface PartyMember {
  id: number;
  slug: string;
  name: string;
  playerName: string;
  rank: string | null;
  stats: CharacterStats;
  // Aus Fitness + Talent-Bonus gerechnet (computeStress), nicht gepflegt.
  maxStress: number | null;
  // Nur die Namen, ohne den Regeltext — die Tabelle soll auf ein Blatt
  // passen. Der volle Text steht auf dem Charakterbogen.
  talents: string[];
  focuses: string[];
  values: string[];
}

export async function getPartySheet(): Promise<PartyMember[]> {
  const rows = await sql<
    {
      id: number;
      slug: string;
      name: string;
      playerName: string;
      rank: string | null;
      metadata: { stats?: unknown; rank?: string } | null;
    }[]
  >`
    SELECT c.id, c.slug, c.name, u.name AS "playerName",
           c.metadata->>'rank' AS rank,
           c.metadata
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.deleted_at IS NULL
      AND c.is_draft = false
      AND c.status = 'active'
    ORDER BY c.name ASC
  `;

  return rows.map((row) => {
    const stats = parseCharacterStats(row.metadata?.stats);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      playerName: row.playerName,
      rank: row.rank,
      stats,
      maxStress: computeStress(stats),
      // Ein Talent kann umbenannt gespeichert sein („Eigener Name (Original)",
      // siehe parseTalentEntry) — für die Tabelle zählt der angezeigte Name.
      talents: stats.talents.map((entry) => parseTalentEntry(entry).name),
      focuses: stats.focuses,
      values: stats.values,
    };
  });
}
