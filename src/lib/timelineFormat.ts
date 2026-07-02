// Geteilte, React-freie Helfer für die Timeline-Seite.
export { fmtDate, yearOf } from "@/lib/missionFormat";
import type { TimelineSourceType } from "@/types/timeline";

interface CategoryVisual {
  label: string;
  color: string;
}

// Bekannte Kategorien mit fester Farbe/Label. Kategorie ist ansonsten freier
// Text (siehe scripts/ingest/timeline.ts) — unbekannte Werte fallen auf eine
// Farbrotation zurück (categoryVisual), keine Schema-Änderung nötig, um eine
// neue Kategorie im Vault zu benutzen.
const KNOWN_CATEGORIES: Record<string, CategoryVisual> = {
  mission_start: { label: "Mission gestartet", color: "var(--lcars-green)" },
  mission_end: { label: "Mission abgeschlossen", color: "var(--lcars-blue)" },
  event: { label: "Ereignis", color: "var(--lcars-red)" },
  dialogue: { label: "Gespräch", color: "var(--lcars-text-data)" },
  sonstiges: { label: "Sonstiges", color: "var(--lcars-amber)" },
};

const FALLBACK_COLORS = [
  "var(--lcars-amber-light)",
  "var(--lcars-purple)",
  "var(--lcars-orange)",
  "var(--lcars-amber)",
];

export function categoryVisual(category: string): CategoryVisual {
  const known = KNOWN_CATEGORIES[category];
  if (known) return known;

  const hash = [...category].reduce((h, c) => h + c.charCodeAt(0), 0);
  return {
    label: category.charAt(0).toUpperCase() + category.slice(1),
    color: FALLBACK_COLORS[hash % FALLBACK_COLORS.length],
  };
}

export const SOURCE_TYPE_LABELS: Record<TimelineSourceType, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Mission-Log",
  archive_entry: "Archiv",
};

// Datums-Sortierung für TimelineEvent (analog byDateAsc/Desc in
// missionFormat.ts, andere Feldform: event_date statt log_date).
export function byEventDateAsc(
  a: { event_date: string },
  b: { event_date: string },
): number {
  return a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : 0;
}

export function byEventDateDesc(
  a: { event_date: string },
  b: { event_date: string },
): number {
  return a.event_date < b.event_date ? 1 : a.event_date > b.event_date ? -1 : 0;
}
