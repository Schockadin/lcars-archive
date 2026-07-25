import "server-only";
import sql from "@/lib/db";
import type { TimelineSourceType } from "@/types/timeline";
import { getNewsSeenForUser } from "@/lib/newsSeen";

// News-Kind: neu erstellt / bearbeitet / gelöscht. Entspricht den drei
// einstellbaren News-Arten im Profil (users.news_kinds).
export type NewsKind = "created" | "updated" | "deleted";

export interface NewsFeedItem {
  // Stabiler Client-Key (kind + Ziel + Zeitstempel).
  key: string;
  kind: NewsKind;
  // Ziel für das Ausblenden/„gesehen"-Tracking (news_seen): bei Inhalten der
  // Inhaltstyp + Slug, bei Löschungen 'deletion' + content_deletions.id.
  targetType: TimelineSourceType | "deletion";
  targetKey: string;
  title: string;
  // null bei gelöschten Inhalten (Ziel existiert nicht mehr).
  href: string | null;
  timestamp: string;
  authorName: string | null;
}

interface RecentActivityRow {
  target_type: TimelineSourceType;
  slug: string;
  title: string;
  mission_slug: string | null;
  dialogue_open: boolean | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

function toHref(row: RecentActivityRow): string {
  switch (row.target_type) {
    case "character":
      return `/characters/${row.slug}`;
    case "mission":
      return `/missions/${row.slug}`;
    case "mission_log":
      return `/missions/${row.mission_slug}/${row.slug}`;
    case "archive_entry":
      // Offene Dialoge leben unter /dialogues, nicht /archive (siehe
      // toFollowedContent in src/lib/follows.ts für dasselbe Muster).
      return row.dialogue_open
        ? `/dialogues/${row.slug}`
        : `/archive/${row.slug}`;
  }
}

// Zeitfenster, aus dem News überhaupt noch stammen können. Anders als früher
// (News nur seit dem letzten Dashboard-Besuch, danach für immer weg) bleiben
// News jetzt persistent sichtbar, bis der User sie ausblendet oder den Inhalt
// aufruft (siehe news_seen). Ein großzügiges Fenster begrenzt trotzdem die
// Kandidatenmenge, damit uralte Änderungen nicht ewig als „News" gelten.
const NEWS_WINDOW_DAYS = 90;

// Persistenter News-Feed fürs Dashboard (NewsSection.tsx). Liefert neu
// erstellte, bearbeitete und gelöschte Inhalte der letzten NEWS_WINDOW_DAYS,
// gefiltert nach:
//   - den vom User gewählten News-Arten (users.news_kinds),
//   - der Sichtbarkeit (öffentlich ODER eigener Inhalt — wie zuvor),
//   - dem „gesehen"-Status (news_seen): eine News verschwindet, sobald ihr
//     Ziel per X ausgeblendet ODER der Inhalt aufgerufen wurde.
//
// Ein Inhalt kann sowohl eine „created"- als auch (nach einer späteren
// Bearbeitung) eine „updated"-News erzeugen — mit unterschiedlichem
// Zeitstempel, aber gleichem Ziel; das „gesehen"-Tracking (seen_at) blendet
// beide korrekt aus. Offene Gespräche bleiben ausgeschlossen (eigene Sektion).
export async function getNewsItems(
  userId: number,
  newsKinds: string[],
  limit = 50,
): Promise<NewsFeedItem[]> {
  const wantCreated = newsKinds.includes("created");
  const wantUpdated = newsKinds.includes("updated");
  const wantDeleted = newsKinds.includes("deleted");
  if (!wantCreated && !wantUpdated && !wantDeleted) return [];

  const since = new Date();
  since.setDate(since.getDate() - NEWS_WINDOW_DAYS);

  const seen = await getNewsSeenForUser(userId);
  const seenMap = new Map<string, Date>();
  for (const s of seen) {
    seenMap.set(`${s.targetType}:${s.targetKey}`, new Date(s.seenAt));
  }
  // Eine News mit Zeitstempel <= seen_at ihres Ziels gilt als erledigt.
  const isSeen = (
    targetType: string,
    targetKey: string,
    timestamp: string,
  ): boolean => {
    const seenAt = seenMap.get(`${targetType}:${targetKey}`);
    return seenAt != null && new Date(timestamp) <= seenAt;
  };

  const items: NewsFeedItem[] = [];

  if (wantCreated || wantUpdated) {
    const rows = await sql<RecentActivityRow[]>`
      SELECT 'character'::text AS target_type, c.slug, c.name AS title,
             NULL::text AS mission_slug, NULL::boolean AS dialogue_open,
             pu.name AS author_name,
             c.created_at::text AS created_at, c.updated_at::text AS updated_at
      FROM characters c
      LEFT JOIN users pu ON pu.id = c.player_id
      WHERE (c.visibility = 'public' OR c.player_id = ${userId})
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
      WHERE (ml.visibility = 'public' OR ml.owner_user_id = ${userId})
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
      WHERE (a.visibility = 'public' OR a.owner_user_id = ${userId})
        AND (a.created_at > ${since} OR a.updated_at > ${since})
        AND (a.category != 'dialogue' OR a.dialogue_open = FALSE)
        AND a.deleted_at IS NULL
        AND (a.is_draft = false OR a.owner_user_id = ${userId})
    `;

    for (const row of rows) {
      const href = toHref(row);
      const createdInWindow = new Date(row.created_at) > since;
      const wasEdited = new Date(row.updated_at) > new Date(row.created_at);

      if (
        wantCreated &&
        createdInWindow &&
        !isSeen(row.target_type, row.slug, row.created_at)
      ) {
        items.push({
          key: `created-${row.target_type}-${row.slug}`,
          kind: "created",
          targetType: row.target_type,
          targetKey: row.slug,
          title: row.title,
          href,
          timestamp: row.created_at,
          authorName: row.author_name,
        });
      }

      if (
        wantUpdated &&
        wasEdited &&
        new Date(row.updated_at) > since &&
        !isSeen(row.target_type, row.slug, row.updated_at)
      ) {
        items.push({
          key: `updated-${row.target_type}-${row.slug}`,
          kind: "updated",
          targetType: row.target_type,
          targetKey: row.slug,
          title: row.title,
          href,
          timestamp: row.updated_at,
          authorName: row.author_name,
        });
      }
    }
  }

  if (wantDeleted) {
    const rows = await sql<
      {
        id: number;
        target_type: TimelineSourceType;
        title: string;
        deleted_at: string;
        deleted_by_name: string | null;
      }[]
    >`
      SELECT cd.id, cd.target_type, cd.title, cd.deleted_at::text AS deleted_at,
             du.name AS deleted_by_name
      FROM content_deletions cd
      LEFT JOIN users du ON du.id = cd.deleted_by
      WHERE cd.deleted_at > ${since}
        AND (cd.visibility IS NULL OR cd.visibility = 'public' OR cd.owner_user_id = ${userId})
      ORDER BY cd.deleted_at DESC
    `;

    for (const row of rows) {
      const key = String(row.id);
      if (isSeen("deletion", key, row.deleted_at)) continue;
      items.push({
        key: `deleted-${row.id}`,
        kind: "deleted",
        targetType: "deletion",
        targetKey: key,
        title: row.title,
        href: null,
        timestamp: row.deleted_at,
        authorName: row.deleted_by_name,
      });
    }
  }

  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
  return items.slice(0, limit);
}
