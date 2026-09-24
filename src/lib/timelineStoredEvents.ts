import "server-only";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { purgeContentImagesFor } from "@/lib/contentImages";
import type { TimelineSourceType } from "@/lib/timelineTypes";
import { revalidateTag } from "next/cache";

// Gespeicherte Zeilen der Chronologie: freie Events (manuell oder per CSV)
// und Altbestand aus der früheren Modellableitung. Neue Modellableitungen
// gibt es nicht mehr; der Altbestand bleibt hier sichtbar und löschbar.
export interface StoredTimelineEvent {
  id: number;
  date: string;
  title: string;
  detail: string | null;
  category: string;
  sourceType: TimelineSourceType | null;
  origin: "inferred" | "manual";
}

export async function listStoredTimelineEvents(): Promise<
  StoredTimelineEvent[]
> {
  const rows = await sql<
    {
      id: number;
      event_date: string;
      title: string;
      detail: string | null;
      category: string;
      source_type: TimelineSourceType | null;
      origin: "inferred" | "manual";
    }[]
  >`
    SELECT id, event_date::text AS event_date, title, detail, category,
           source_type, origin
    FROM timeline_events
    ORDER BY event_date DESC, id DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    date: row.event_date,
    title: row.title,
    detail: row.detail,
    category: row.category,
    sourceType: row.source_type,
    origin: row.origin,
  }));
}

export async function deleteStoredTimelineEvent(id: number): Promise<void> {
  const [deleted] = await sql<{ origin: "inferred" | "manual" }[]>`
    DELETE FROM timeline_events WHERE id = ${id}
    RETURNING origin
  `;
  if (deleted?.origin === "manual") {
    await purgeContentImagesFor("timeline_event", id);
  }
  revalidateTag(cacheTags.timeline, { expire: 0 });
}
