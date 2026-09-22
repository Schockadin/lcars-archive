import "server-only";
import sql from "@/lib/db";
import {
  archiveEditHref,
  archiveHref,
  dialogueHref,
  missionEditHref,
  missionHref,
  missionLogEditHref,
  missionLogHref,
} from "@/lib/contentRoutes";
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
  // Auf die eigentliche Inhaltsseite. Dort stehen neben dem Bearbeiten-Weg
  // auch Kontext, Aktionen und Verknüpfungen des Eintrags zur Verfügung.
  href: string;
  // Der ausdrückliche Bearbeiten-Stift im DraftPanel bleibt ein direkter Weg
  // in den Editor; nur die große Inhaltskarte führt auf die Leseseite.
  editHref: string;
}

interface DraftRow {
  kind: string;
  id: number;
  slug: string;
  title: string;
  updated_at: string;
  mission_slug: string | null;
  dialogue_open: boolean | null;
}

export async function getOwnDrafts(userId: number): Promise<DraftItem[]> {
  const rows = await sql<DraftRow[]>`
    SELECT
      'mission_log' AS kind, logs.id, logs.slug, logs.title,
      logs.updated_at::text AS updated_at,
      missions.slug AS mission_slug,
      NULL::boolean AS dialogue_open
    FROM mission_logs logs
    JOIN missions ON missions.id = logs.mission_id
    WHERE logs.owner_user_id = ${userId}
      AND logs.is_draft = true
      AND logs.deleted_at IS NULL

    UNION ALL

    -- Gespräche liegen als archive_entry der Kategorie 'dialogue' (siehe
    -- contentTypeFormat.ts) — hier getrennt ausgewiesen, weil sie in der
    -- Oberfläche eine eigene Farbe und Beschriftung tragen.
    SELECT
      CASE WHEN category = 'dialogue' THEN 'dialogue' ELSE 'archive_entry' END,
      id, slug, title, updated_at::text,
      NULL::text AS mission_slug,
      dialogue_open
    FROM archive_entries
    WHERE owner_user_id = ${userId} AND is_draft = true AND deleted_at IS NULL

    UNION ALL

    SELECT
      'mission', id, slug, title, updated_at::text,
      NULL::text AS mission_slug,
      NULL::boolean AS dialogue_open
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
    href: draftContentHref(row),
    editHref: draftEditHref(row.kind, row.id),
  }));
}

function draftContentHref(row: DraftRow): string {
  if (row.kind === "mission_log")
    return missionLogHref(row.mission_slug!, row.slug);
  if (row.kind === "mission") return missionHref(row.slug);
  if (row.kind === "dialogue" && row.dialogue_open)
    return dialogueHref(row.slug);
  return archiveHref(row.slug);
}

function draftEditHref(kind: string, id: number): string {
  if (kind === "mission_log") return missionLogEditHref(id);
  if (kind === "mission") return missionEditHref(id);
  // Gespräch und Datenbank-Eintrag teilen sich den Editor — beide sind ein
  // archive_entry.
  return archiveEditHref(id);
}
