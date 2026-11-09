import "server-only";
import sql from "@/lib/db";
import type {
  AdminContentStats,
  ContentViewEvent,
  ContentViewEventInput,
  ContentViewType,
} from "@/lib/contentViewTypes";

// Der Client darf ausschließlich Typ und Slug vorschlagen. Nutzer, Titel und
// Zieladresse kommen erst nach der serverseitigen Sichtbarkeitsprüfung hier an.
export async function recordContentView(
  event: ContentViewEventInput,
): Promise<void> {
  await sql`
    INSERT INTO content_view_events
      (user_id, content_type, content_slug, content_title, route_path)
    VALUES (
      ${event.userId}, ${event.contentType}, ${event.contentSlug},
      ${event.contentTitle}, ${event.routePath}
    )
  `;
}

// Die 7-Tage-Kennzahlen umfassen die letzten sieben Kalendertage in deutscher
// Ortszeit. Die Detailtabelle ist auf die letzten 30 Tage und 500 Aufrufe
// begrenzt; ältere Events werden nach 90 Tagen automatisch entfernt.
export async function getAdminContentStats(): Promise<AdminContentStats> {
  const [summaryRows, dailyRows, typeRows, recentViews] = await Promise.all([
    sql<
      {
        total_accounts: number;
        signups_last_week: number;
        views_last_week: number;
        unique_viewers_last_week: number;
      }[]
    >`
      WITH bounds AS (
        SELECT (
          (date_trunc('day', NOW() AT TIME ZONE 'Europe/Berlin') - INTERVAL '6 days')
          AT TIME ZONE 'Europe/Berlin'
        ) AS starts_at
      )
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_accounts,
        (SELECT COUNT(*)::int FROM users, bounds
          WHERE users.created_at >= bounds.starts_at) AS signups_last_week,
        (SELECT COUNT(*)::int FROM content_view_events, bounds
          WHERE content_view_events.viewed_at >= bounds.starts_at) AS views_last_week,
        (SELECT COUNT(DISTINCT user_id)::int FROM content_view_events, bounds
          WHERE content_view_events.viewed_at >= bounds.starts_at) AS unique_viewers_last_week
    `,
    sql<{ date: string; views: number; signups: number }[]>`
      WITH bounds AS (
        SELECT
          date_trunc('day', NOW() AT TIME ZONE 'Europe/Berlin') - INTERVAL '6 days' AS first_day,
          (
            (date_trunc('day', NOW() AT TIME ZONE 'Europe/Berlin') - INTERVAL '6 days')
            AT TIME ZONE 'Europe/Berlin'
          ) AS starts_at,
          (NOW() AT TIME ZONE 'Europe/Berlin')::date AS today
      ),
      days AS (
        SELECT generate_series(first_day, today::timestamp, INTERVAL '1 day')::date AS day
        FROM bounds
      ),
      view_counts AS (
        SELECT (viewed_at AT TIME ZONE 'Europe/Berlin')::date AS day, COUNT(*)::int AS count
        FROM content_view_events
        WHERE viewed_at >= (SELECT starts_at FROM bounds)
        GROUP BY 1
      ),
      signup_counts AS (
        SELECT (created_at AT TIME ZONE 'Europe/Berlin')::date AS day, COUNT(*)::int AS count
        FROM users
        WHERE created_at >= (SELECT starts_at FROM bounds)
        GROUP BY 1
      )
      SELECT days.day::text AS date,
             COALESCE(view_counts.count, 0)::int AS views,
             COALESCE(signup_counts.count, 0)::int AS signups
      FROM days
      LEFT JOIN view_counts ON view_counts.day = days.day
      LEFT JOIN signup_counts ON signup_counts.day = days.day
      ORDER BY days.day ASC
    `,
    sql<{ content_type: ContentViewType; count: number }[]>`
      WITH bounds AS (
        SELECT (
          (date_trunc('day', NOW() AT TIME ZONE 'Europe/Berlin') - INTERVAL '6 days')
          AT TIME ZONE 'Europe/Berlin'
        ) AS starts_at
      )
      SELECT content_type, COUNT(*)::int AS count
      FROM content_view_events, bounds
      WHERE viewed_at >= bounds.starts_at
      GROUP BY content_type
      ORDER BY COUNT(*) DESC, content_type ASC
    `,
    sql<
      {
        id: number;
        viewed_at: string;
        user_name: string;
        user_email: string;
        content_type: ContentViewType;
        content_slug: string;
        content_title: string;
        route_path: string;
      }[]
    >`
      SELECT e.id, e.viewed_at::text AS viewed_at,
             u.name AS user_name, u.email AS user_email,
             e.content_type, e.content_slug, e.content_title, e.route_path
      FROM content_view_events e
      JOIN users u ON u.id = e.user_id
      WHERE e.viewed_at >= NOW() - INTERVAL '30 days'
      ORDER BY e.viewed_at DESC, e.id DESC
      LIMIT 500
    `,
  ]);

  const summary = summaryRows[0];
  return {
    totalAccounts: summary?.total_accounts ?? 0,
    signupsLastWeek: summary?.signups_last_week ?? 0,
    viewsLastWeek: summary?.views_last_week ?? 0,
    uniqueViewersLastWeek: summary?.unique_viewers_last_week ?? 0,
    daily: dailyRows,
    viewsByType: typeRows.map((row) => ({
      contentType: row.content_type,
      count: row.count,
    })),
    recentViews: recentViews.map((row) => ({
      id: row.id,
      viewedAt: row.viewed_at,
      userName: row.user_name,
      userEmail: row.user_email,
      contentType: row.content_type,
      contentSlug: row.content_slug,
      contentTitle: row.content_title,
      routePath: row.route_path,
    })),
  };
}
