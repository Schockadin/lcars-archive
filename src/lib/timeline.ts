import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { TimelineEvent } from "@/types/timeline";

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

