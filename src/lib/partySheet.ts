import "server-only";
import sql from "@/lib/db";
import { parseCharacterStats, computeStress } from "@/lib/characterStats";
import { parseTalentEntry } from "@/lib/talentCatalog";
import type { CharacterStats } from "@/types/characterStats";
import { resolvePortraitView, type PortraitCrop } from "@/lib/portraitCrop";

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
  // Für die Bogen-Vorschau, die ein Klick auf den Namen öffnet — dieselben
  // Angaben, die auch auf der Charakterseite in den Bogen gehen.
  species: string | null;
  // Das Portrait-ORIGINAL und der darauf gewählte Ausschnitt — damit die
  // Bogen-Vorschau hier dieselbe Bildstelle zeigt wie die Charakterseite
  // und das PDF (siehe src/lib/portraitCrop.ts).
  portrait: string | null;
  portraitCrop: PortraitCrop;
  bioHtml: string | null;
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
      species: string | null;
      portrait: string | null;
      bioHtml: string | null;
      metadata: {
        stats?: unknown;
        rank?: string;
        portraitSource?: string | null;
        portraitCrop?: unknown;
      } | null;
    }[]
  >`
    SELECT c.id, c.slug, c.name, u.name AS "playerName",
           -- Rang und Spezies stehen bei App-Charakteren in metadata, bei
           -- importierten in der gleichnamigen Spalte (siehe
           -- getCharacterStatsForGm) — erst metadata, dann die Spalte.
           COALESCE(NULLIF(c.metadata ->> 'rank', ''), c.rank) AS rank,
           COALESCE(
             NULLIF(
               (SELECT string_agg(value, ', ')
                FROM jsonb_array_elements_text(
                  CASE WHEN jsonb_typeof(c.metadata -> 'species') = 'array'
                       THEN c.metadata -> 'species' ELSE '[]'::jsonb END
                ) AS value),
               ''
             ),
             c.species
           ) AS species,
           c.portrait, c.bio AS "bioHtml",
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
    const portraitView = resolvePortraitView(
      row.portrait,
      row.metadata?.portraitSource,
      row.metadata?.portraitCrop,
    );
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      playerName: row.playerName,
      rank: row.rank,
      species: row.species,
      portrait: portraitView.src,
      portraitCrop: portraitView.crop,
      bioHtml: row.bioHtml,
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
