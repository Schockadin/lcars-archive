import "server-only";
import sql from "@/lib/db";
import { getNewsSeenForUser } from "@/lib/newsSeen";
import {
  computeNewsItems,
  type NewsContentRow,
  type NewsDeletionRow,
  type NewsFeedItem,
} from "@/lib/recentActivityFormat";

// Re-Export für bestehende Importe (NewsSection.tsx).
export type { NewsFeedItem, NewsKind } from "@/lib/recentActivityFormat";

// Zeitfenster, aus dem News überhaupt noch stammen können. Anders als früher
// (News nur seit dem letzten Dashboard-Besuch, danach für immer weg) bleiben
// News jetzt persistent sichtbar, bis der User sie ausblendet oder den Inhalt
// aufruft (siehe news_seen). Ein großzügiges Fenster begrenzt trotzdem die
// Kandidatenmenge, damit uralte Änderungen nicht ewig als „News" gelten.
const NEWS_WINDOW_DAYS = 90;

// Persistenter News-Feed fürs Dashboard (NewsSection.tsx). Lädt die
// Kandidaten-Zeilen aus der DB und überlässt die eigentliche Aufbereitung
// (created/updated-Ableitung, „gesehen"-Filter, Sortierung) der reinen,
// getesteten Funktion computeNewsItems (recentActivityFormat.ts).
//
// News umfassen ALLE neuen Inhalte, die der Betrachter sehen darf: Admins
// sehen jede Sichtbarkeit, GMs zusätzlich gm-Inhalte, alle anderen nur
// öffentliche + eigene (Entwürfe bleiben immer owner-only, siehe
// canViewDraft). Offene Gespräche bleiben ausgeschlossen (eigene Sektion).
export async function getNewsItems(
  userId: number,
  newsKinds: string[],
  viewerRole: string,
): Promise<NewsFeedItem[]> {
  const wantCreated = newsKinds.includes("created");
  const wantUpdated = newsKinds.includes("updated");
  const wantDeleted = newsKinds.includes("deleted");
  if (!wantCreated && !wantUpdated && !wantDeleted) return [];

  const isAdmin = viewerRole === "admin";
  const isGmOrAdmin = viewerRole === "gm" || isAdmin;

  const since = new Date();
  since.setDate(since.getDate() - NEWS_WINDOW_DAYS);

  const seenEntries = await getNewsSeenForUser(userId);

  let contentRows: NewsContentRow[] = [];
  if (wantCreated || wantUpdated) {
    contentRows = await sql<NewsContentRow[]>`
      SELECT 'character'::text AS target_type, c.slug, c.name AS title,
             NULL::text AS mission_slug, NULL::boolean AS dialogue_open,
             pu.name AS author_name,
             c.created_at::text AS created_at, c.updated_at::text AS updated_at
      FROM characters c
      LEFT JOIN users pu ON pu.id = c.player_id
      WHERE (c.visibility = 'public' OR c.player_id = ${userId}
             OR ${isAdmin} OR (${isGmOrAdmin} AND c.visibility = 'gm'))
        AND (c.created_at > ${since} OR c.updated_at > ${since})
        AND c.deleted_at IS NULL
        AND (c.is_draft = false OR c.player_id = ${userId})

      UNION ALL

      SELECT 'mission'::text, m.slug, m.title,
             NULL::text, NULL::boolean,
             ou.name,
             m.created_at::text, m.updated_at::text
      FROM missions m
      LEFT JOIN users ou ON ou.id = m.owner_user_id
      WHERE (m.created_at > ${since} OR m.updated_at > ${since})
        AND m.deleted_at IS NULL
        AND m.is_draft = false

      UNION ALL

      SELECT 'mission_log'::text, ml.slug, ml.title,
             m.slug, NULL::boolean,
             ou.name,
             ml.created_at::text, ml.updated_at::text
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id
      LEFT JOIN users ou ON ou.id = ml.owner_user_id
      WHERE (ml.visibility = 'public' OR ml.owner_user_id = ${userId}
             OR ${isAdmin} OR (${isGmOrAdmin} AND ml.visibility = 'gm'))
        AND (ml.created_at > ${since} OR ml.updated_at > ${since})
        AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
        AND (ml.is_draft = false OR ml.owner_user_id = ${userId})

      UNION ALL

      SELECT 'archive_entry'::text, a.slug, a.title,
             NULL::text, a.dialogue_open,
             au.name,
             a.created_at::text, a.updated_at::text
      FROM archive_entries a
      LEFT JOIN users au ON au.id = a.owner_user_id
      WHERE (a.visibility = 'public' OR a.owner_user_id = ${userId}
             OR ${isAdmin} OR (${isGmOrAdmin} AND a.visibility = 'gm'))
        AND (a.created_at > ${since} OR a.updated_at > ${since})
        AND (a.category != 'dialogue' OR a.dialogue_open = FALSE)
        AND a.deleted_at IS NULL
        AND (a.is_draft = false OR a.owner_user_id = ${userId})
    `;
  }

  let deletionRows: NewsDeletionRow[] = [];
  if (wantDeleted) {
    deletionRows = await sql<NewsDeletionRow[]>`
      SELECT cd.id, cd.target_type, cd.title, cd.deleted_at::text AS deleted_at,
             du.name AS deleted_by_name
      FROM content_deletions cd
      LEFT JOIN users du ON du.id = cd.deleted_by
      WHERE cd.deleted_at > ${since}
        AND (cd.visibility IS NULL OR cd.visibility = 'public'
             OR cd.owner_user_id = ${userId}
             OR ${isAdmin} OR (${isGmOrAdmin} AND cd.visibility = 'gm'))
      ORDER BY cd.deleted_at DESC
    `;
  }

  return computeNewsItems({
    contentRows,
    deletionRows,
    seenEntries,
    newsKinds,
    since,
  });
}
