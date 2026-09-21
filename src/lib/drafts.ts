import "server-only";
import sql from "@/lib/db";
import { archiveEditHref, missionEditHref, missionLogEditHref } from "@/lib/contentRoutes";
import type { ContentTypeKey } from "@/lib/contentTypeFormat";

// Die eigenen unfertigen Inhalte — für den Abschnitt „Entwürfe" auf der
// Startseite und unter „Meine Inhalte".
//
// Maßgeblich ist der BESITZ (owner_user_id), nicht die Beteiligung: Ein
// Gesprächs-Entwurf, den jemand anderes begonnen hat und in dem eine eigene
// Figur mitspielt, ist nicht meiner — veröffentlichen darf ihn nur, wem er
// gehört (siehe setArchiveEntryDraft/setDialogueDraft). Deshalb hier eine
// eigene Abfrage statt der Listen aus „Meine Inhalte":
// getDialoguesForUser sucht über die Teilnahme, und das ist für diese Frage
// die falsche Grenze.
//
// Charaktere stehen bewusst nicht darin: Sie haben mit /user/characters ihren
// eigenen Bereich und fehlen aus demselben Grund in der Liste unter „Meine
// Inhalte".
//
// Eine Abfrage über UNION ALL statt drei einzelner: Der Abschnitt steht auf
// der meistbesuchten Seite der Anwendung, und drei Roundtrips zur (entfernten)
// Datenbank sind dort spürbar.

export interface DraftItem {
  kind: ContentTypeKey;
  id: number;
  slug: string;
  title: string;
  // Wann zuletzt daran gearbeitet wurde (ISO). Das Neueste zuerst — woran man
  // gerade sitzt, steht oben.
  updatedAt: string;
  // Direkt in den Editor: Bei einem Entwurf will man weiterschreiben, nicht
  // erst die Leseseite sehen (die es für andere ohnehin nicht gibt).
  href: string;
}

interface DraftRow {
  kind: string;
  id: number;
  slug: string;
  title: string;
  updated_at: string;
}

export async function getOwnDrafts(userId: number): Promise<DraftItem[]> {
  const rows = await sql<DraftRow[]>`
    SELECT 'mission_log' AS kind, id, slug, title, updated_at::text AS updated_at
    FROM mission_logs
    WHERE owner_user_id = ${userId} AND is_draft = true AND deleted_at IS NULL

    UNION ALL

    -- Gespräche liegen als archive_entry der Kategorie 'dialogue' (siehe
    -- contentTypeFormat.ts) — hier getrennt ausgewiesen, weil sie in der
    -- Oberfläche eine eigene Farbe und Beschriftung tragen.
    SELECT
      CASE WHEN category = 'dialogue' THEN 'dialogue' ELSE 'archive_entry' END,
      id, slug, title, updated_at::text
    FROM archive_entries
    WHERE owner_user_id = ${userId} AND is_draft = true AND deleted_at IS NULL

    UNION ALL

    SELECT 'mission', id, slug, title, updated_at::text
    FROM missions
    WHERE owner_user_id = ${userId} AND is_draft = true AND deleted_at IS NULL

    ORDER BY updated_at DESC
  `;

  return rows.map((row) => ({
    kind: row.kind as ContentTypeKey,
    id: row.id,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
    href: draftEditHref(row.kind, row.id),
  }));
}

function draftEditHref(kind: string, id: number): string {
  if (kind === "mission_log") return missionLogEditHref(id);
  if (kind === "mission") return missionEditHref(id);
  // Gespräch und Datenbank-Eintrag teilen sich den Editor — beide sind ein
  // archive_entry.
  return archiveEditHref(id);
}
