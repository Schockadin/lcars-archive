import "server-only";
import sql from "@/lib/db";
import type { TimelineSourceType } from "@/types/timeline";

export interface ContentActivityItem {
  kind: "created" | "updated" | "deleted";
  targetType: TimelineSourceType;
  title: string;
  href: string | null;
  timestamp: string;
  // Bei "created"/"updated" der Owner (player_id/owner_user_id), bei
  // "deleted" die löschende Person (content_deletions.deleted_by) — KEINE
  // echte "wer hat zuletzt bearbeitet"-Spur, die gibt es im Schema nicht
  // (siehe recentActivity.ts): eine Admin-/GM-Bearbeitung an fremdem Inhalt
  // erscheint hier unter dem Namen des Owners, nicht der bearbeitenden
  // Person.
  actorName: string | null;
}

interface ActivityRow {
  target_type: TimelineSourceType;
  slug: string;
  title: string;
  mission_slug: string | null;
  dialogue_open: boolean | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

function toHref(row: ActivityRow): string {
  switch (row.target_type) {
    case "character":
      return `/characters/${row.slug}`;
    case "mission":
      return `/missions/${row.slug}`;
    case "mission_log":
      return `/missions/${row.mission_slug}/${row.slug}`;
    case "archive_entry":
      return row.dialogue_open
        ? `/dialogues/${row.slug}`
        : `/archive/${row.slug}`;
  }
}

// Admin-only Content-Aktivitätslog für /admin/audit-log, neben der
// sicherheitsrelevanten Useraccount-Historie (auditLog.ts). Anders als
// getRecentActivity/getRecentDeletions in recentActivity.ts (per Viewer
// gefiltert nach Sichtbarkeit + "seit letztem Dashboard-Besuch") zeigt das
// hier ALLES — unabhängig von Sichtbarkeit — über einen festen Zeitraum
// (Tage rückwärts ab jetzt), da ein Admin-Log keine Viewer-Perspektive hat.
export async function getRecentContentActivity(
  days: number,
): Promise<ContentActivityItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await sql<ActivityRow[]>`
    SELECT 'character'::text AS target_type, c.slug, c.name AS title,
           NULL::text AS mission_slug, NULL::boolean AS dialogue_open,
           pu.name AS author_name,
           c.created_at::text AS created_at, c.updated_at::text AS updated_at
    FROM characters c
    LEFT JOIN users pu ON pu.id = c.player_id
    WHERE (c.created_at > ${since} OR c.updated_at > ${since}) AND c.is_draft = false

    UNION ALL

    SELECT 'mission'::text, m.slug, m.title,
           NULL::text, NULL::boolean,
           ou.name,
           m.created_at::text, m.updated_at::text
    FROM missions m
    LEFT JOIN users ou ON ou.id = m.owner_user_id
    WHERE (m.created_at > ${since} OR m.updated_at > ${since}) AND m.is_draft = false

    UNION ALL

    SELECT 'mission_log'::text, ml.slug, ml.title,
           m.slug, NULL::boolean,
           ou.name,
           ml.created_at::text, ml.updated_at::text
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    LEFT JOIN users ou ON ou.id = ml.owner_user_id
    WHERE (ml.created_at > ${since} OR ml.updated_at > ${since}) AND ml.is_draft = false

    UNION ALL

    SELECT 'archive_entry'::text, a.slug, a.title,
           NULL::text, a.dialogue_open,
           au.name,
           a.created_at::text, a.updated_at::text
    FROM archive_entries a
    LEFT JOIN users au ON au.id = a.owner_user_id
    WHERE (a.created_at > ${since} OR a.updated_at > ${since})
      AND (a.category != 'dialogue' OR a.dialogue_open = FALSE)
      AND a.is_draft = false
  `;

  const items: ContentActivityItem[] = rows.map((row) => {
    const createdAt = new Date(row.created_at);
    const isNew = createdAt > since;
    return {
      kind: isNew ? "created" : "updated",
      targetType: row.target_type,
      title: row.title,
      href: toHref(row),
      timestamp: isNew ? row.created_at : row.updated_at,
      actorName: row.author_name,
    };
  });

  const deletions = await sql<
    {
      target_type: TimelineSourceType;
      title: string;
      deleted_at: string;
      deleted_by_name: string | null;
    }[]
  >`
    SELECT cd.target_type, cd.title, cd.deleted_at::text AS deleted_at,
           du.name AS deleted_by_name
    FROM content_deletions cd
    LEFT JOIN users du ON du.id = cd.deleted_by
    WHERE cd.deleted_at > ${since}
  `;
  for (const d of deletions) {
    items.push({
      kind: "deleted",
      targetType: d.target_type,
      title: d.title,
      href: null,
      timestamp: d.deleted_at,
      actorName: d.deleted_by_name,
    });
  }

  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return items;
}
