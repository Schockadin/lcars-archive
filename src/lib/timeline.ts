import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { RecentActivityEvent, TimelineEvent } from "@/types/timeline";

// Alle Timeline-Ereignisse. Wird komplett vom Ingest befüllt
// (scripts/ingest/timeline.ts) — hier nur lesender Zugriff. Nur Ereignisse
// sichtbarer Quell-Inhalte: LEFT JOINs auf die jeweilige Quelltabelle nach
// source_type/source_slug, COALESCE fällt auf 'public' zurück, wenn kein
// Join greift (Missionen haben keine visibility-Spalte, sind also immer
// public; ein source_slug ohne (mehr) existierende Quellzeile ebenso).
export const getAllTimelineEvents = unstable_cache(
  async (): Promise<TimelineEvent[]> => {
    const rows = await sql<TimelineEvent[]>`
      SELECT
        te.id,
        te.event_date::text AS event_date,
        te.title,
        te.category,
        te.source_type,
        te.source_slug,
        te.href
      FROM timeline_events te
      LEFT JOIN characters      ch ON te.source_type = 'character'     AND ch.slug = te.source_slug
      LEFT JOIN mission_logs    ml ON te.source_type = 'mission_log'   AND ml.slug = te.source_slug
      LEFT JOIN archive_entries ae ON te.source_type = 'archive_entry' AND ae.slug = te.source_slug
      WHERE COALESCE(ch.visibility, ml.visibility, ae.visibility, 'public') = 'public'
      ORDER BY te.event_date DESC NULLS LAST, te.id DESC
    `;
    return rows;
  },
  ["getAllTimelineEvents", "v2"],
  { tags: [cacheTags.timeline] },
);

// "Neu seit deinem letzten Besuch" auf dem Dashboard (src/app/users/[id]/
// RecentActivity.tsx). Filtert bewusst nach created_at (tatsächliche
// Ingest-Zeit, siehe scripts/ingest/timeline.ts) statt event_date (das
// In-Story-Datum) — nur created_at beantwortet "was ist neu im Archiv".
// since === null (allererster Login) liefert bewusst eine leere Liste,
// statt das komplette Archiv als "neu" zu zeigen. Kein unstable_cache: die
// Dashboard-Route ist durch den Session-Zugriff ohnehin dynamisch, pro
// User unterschiedlich, und soll nach dem nächsten Ingest sofort frisch
// sein.
export async function getRecentActivitySince(
  since: Date | null,
  limit = 20,
): Promise<RecentActivityEvent[]> {
  if (!since) return [];

  const rows = await sql<RecentActivityEvent[]>`
    SELECT
      te.id,
      te.event_date::text AS event_date,
      te.title,
      te.category,
      te.source_type,
      te.source_slug,
      te.href,
      te.created_at::text AS created_at
    FROM timeline_events te
    LEFT JOIN characters      ch ON te.source_type = 'character'     AND ch.slug = te.source_slug
    LEFT JOIN mission_logs    ml ON te.source_type = 'mission_log'   AND ml.slug = te.source_slug
    LEFT JOIN archive_entries ae ON te.source_type = 'archive_entry' AND ae.slug = te.source_slug
    WHERE te.created_at > ${since}
      AND COALESCE(ch.visibility, ml.visibility, ae.visibility, 'public') = 'public'
    ORDER BY te.created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}
