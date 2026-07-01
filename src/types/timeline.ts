export type TimelineSourceType =
  | "character"
  | "mission"
  | "mission_log"
  | "archive_entry";

// Ein Ereignis auf der Timeline. Kategorie ist freier Text (siehe
// scripts/ingest/timeline.ts) — die Farbzuordnung erfolgt in
// src/lib/timelineFormat.ts mit Fallback für unbekannte Werte.
export interface TimelineEvent {
  id: number;
  event_date: string;
  title: string;
  category: string;
  source_type: TimelineSourceType;
  source_slug: string;
  href: string;
}
