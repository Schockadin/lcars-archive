import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { TimelineEvent } from "@/types/timeline";

// Alle Timeline-Ereignisse. Wird komplett vom Ingest befüllt
// (scripts/ingest/timeline.ts) — hier nur lesender Zugriff.
export const getAllTimelineEvents = unstable_cache(
  async (): Promise<TimelineEvent[]> => {
    const rows = await sql<TimelineEvent[]>`
      SELECT
        id,
        event_date::text AS event_date,
        title,
        category,
        source_type,
        source_slug,
        href
      FROM timeline_events
      ORDER BY event_date DESC NULLS LAST, id DESC
    `;
    return rows;
  },
  ["getAllTimelineEvents"],
  { tags: [cacheTags.timeline] },
);
