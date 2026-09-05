// Die Chronologie (/chronologie): Typen, Kategorien und die reinen Helfer.
//
// Bewusst OHNE `server-only` — die Ansicht ist eine Client-Komponente und
// braucht Kategorien, Sortierung und Gruppierung; der Datenzugriff liegt
// daneben in src/lib/timeline.ts. Dieselbe Aufteilung wie
// contentNoteTypes.ts/contentNotes.ts.

import { fmtDate } from "@/lib/missionFormat";

export { fmtDate };

// Woher ein Ereignis stammt. Die Unterscheidung steht in der Ansicht, weil
// „vom Modell aus dem Text gelesen" etwas anderes ist als „so gepflegt":
//   metadata — aus den Feldern des Inhalts (Missionsdatum, Logbuch-Datum, …)
//   marker   — aus einem <!-- timeline: … -->-Marker im Fließtext
//   inferred — vom Sprachmodell aus dem Text abgeleitet (siehe
//              src/lib/timelineInference.ts), von der Spielleitung übernommen
export type TimelineOrigin = "metadata" | "marker" | "inferred";

export const ORIGIN_LABELS: Record<TimelineOrigin, string> = {
  metadata: "aus den Angaben des Eintrags",
  marker: "im Text markiert",
  inferred: "aus dem Text abgeleitet",
};

// Die Inhaltsart, aus der das Ereignis stammt — dieselben vier wie überall
// sonst (contentTypeFormat.ts), hier mit den Beschriftungen der Chronologie.
export type TimelineSourceType =
  | "character"
  | "mission"
  | "mission_log"
  | "archive_entry";

export const SOURCE_TYPE_LABELS: Record<TimelineSourceType, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Logbuch",
  archive_entry: "Datenbank",
};

// Ereignisarten. Die Liste orientiert sich am Entwurf der Chronologie
// (Mission, Entdeckung, Konflikt, Politik, Person) und ergänzt, was die
// Kampagne ohnehin führt (Logbuch, Gespräch). Die Farben sind die
// LCARS-Akzente — dieselbe Quelle wie STATUS_CONFIG in missionFormat.ts,
// damit die Chronologie zur Missions-Übersicht passt.
export const EVENT_CATEGORIES = [
  { key: "mission", label: "Mission", color: "var(--lcars-primary)" },
  { key: "log", label: "Logbuch", color: "var(--lcars-primary-light)" },
  { key: "discovery", label: "Entdeckung", color: "var(--lcars-tertiary)" },
  { key: "conflict", label: "Konflikt", color: "var(--lcars-quinary)" },
  { key: "political", label: "Politik", color: "var(--lcars-quaternary)" },
  { key: "character", label: "Person", color: "var(--lcars-senary)" },
  { key: "dialogue", label: "Gespräch", color: "var(--lcars-secondary)" },
  { key: "other", label: "Sonstiges", color: "var(--lcars-ink-dim)" },
] as const;

export type TimelineCategory = (typeof EVENT_CATEGORIES)[number]["key"];

const CATEGORY_BY_KEY = new Map(
  EVENT_CATEGORIES.map((c) => [c.key, c] as const),
);

// Ein unbekannter Kategoriewert (alter Marker, von Hand getippt) fällt auf
// „Sonstiges" zurück, behält aber seinen Text als Beschriftung — verschluckt
// wird nichts.
export function categoryVisual(key: string): {
  key: string;
  label: string;
  color: string;
} {
  const known = CATEGORY_BY_KEY.get(key as TimelineCategory);
  if (known) return known;
  return {
    key,
    label: key,
    color: "var(--lcars-ink-dim)",
  };
}

export interface TimelineEvent {
  // Stabil über Neuladen hinweg, aber nicht zwingend eine DB-Id: die meisten
  // Ereignisse entstehen beim Lesen aus den Feldern des Inhalts. Aufgebaut
  // als "<quelle>:<slug>:<was>" (siehe eventId).
  id: string;
  // In-Story-Datum, ISO (YYYY-MM-DD).
  date: string;
  title: string;
  // Ein bis zwei Sätze zum Ereignis; leer, wo es nichts zu sagen gibt.
  detail: string | null;
  category: string;
  origin: TimelineOrigin;
  sourceType: TimelineSourceType;
  sourceTitle: string;
  href: string;
  // Beteiligte Figuren/NPCs, soweit am Inhalt gepflegt — im Entwurf die Zeile
  // „PERSONEN: …".
  people: string[];
}

export function eventId(
  sourceType: TimelineSourceType,
  slug: string,
  discriminator: string,
): string {
  return `${sourceType}:${slug}:${discriminator}`;
}

// ---------------------------------------------------------------------------
// Marker im Fließtext
// ---------------------------------------------------------------------------

// <!-- timeline: JJJJ-MM-TT | Titel | Kategorie -->
// Dieselbe Form, die TimelineMarkerButton einfügt. Die Kategorie ist optional
// (Vorgabe „other"), ein fehlendes oder unplausibles Datum verwirft den
// Marker: ein Ereignis ohne Datum hat in einer Chronologie keinen Platz.
const MARKER_RE = /<!--\s*timeline\s*:(.*?)-->/gs;

export interface ParsedMarker {
  date: string;
  title: string;
  category: string;
  // Position des Markers im Dokument (1-basiert) — dieselbe Zählung wie die
  // Sprungmarken #timeline-N aus remarkTimelineAnchors (src/lib/markdown.ts),
  // damit die Karte genau an die markierte Stelle verlinken kann.
  anchor: number;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Der Kalender selbst entscheidet: der 31. Februar existiert nicht.
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

export function parseTimelineMarkers(markdown: string): ParsedMarker[] {
  if (!markdown) return [];
  const out: ParsedMarker[] = [];
  let anchor = 0;
  // Jeder Marker zählt für die Ankernummer mit — auch ein ungültiger, denn
  // remarkTimelineAnchors zählt ebenfalls jeden. Sonst zeigten die Links der
  // Chronologie hinter einem kaputten Marker auf die falsche Stelle.
  for (const match of markdown.matchAll(MARKER_RE)) {
    anchor += 1;
    const parts = match[1].split("|").map((p) => p.trim());
    const [date, title, category] = parts;
    if (!date || !isIsoDate(date) || !title) continue;
    out.push({
      date,
      title,
      category: category || "other",
      anchor,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sortieren und Gruppieren
// ---------------------------------------------------------------------------

export type TimelineSortDir = "asc" | "desc";

export function sortEvents(
  events: TimelineEvent[],
  dir: TimelineSortDir,
): TimelineEvent[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -factor : factor;
    // Bei gleichem Datum immer dieselbe Reihenfolge, sonst springen die
    // Karten zwischen zwei Aufrufen — der Titel entscheidet.
    return a.title.localeCompare(b.title, "de");
  });
}

export function yearOf(date: string): string {
  return date.slice(0, 4);
}

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// Zwischenüberschrift über einer Gruppe: „2401 · März". Der Entwurf schreibt
// dort „2167 // MÄRZ"; die Versalien macht das Stylesheet, nicht der Text.
export function periodLabel(date: string): string {
  const month = Number(date.slice(5, 7));
  const name = MONTH_NAMES[month - 1];
  return name ? `${yearOf(date)} · ${name}` : yearOf(date);
}

export function periodKey(date: string): string {
  return date.slice(0, 7);
}

// Alle Jahre, in denen mindestens ein Ereignis liegt — aufsteigend, für die
// Jahresleiste über der Liste.
export function yearsOf(events: TimelineEvent[]): string[] {
  return [...new Set(events.map((e) => yearOf(e.date)))].sort();
}

// Filter der Ansicht. Als reine Funktion, damit die Kombination aus Suche,
// Kategorie und Jahr für sich prüfbar ist.
export interface TimelineFilter {
  query: string;
  category: string | null;
  year: string | null;
}

export function filterEvents(
  events: TimelineEvent[],
  filter: TimelineFilter,
): TimelineEvent[] {
  const q = filter.query.trim().toLowerCase();
  return events.filter((event) => {
    if (filter.category && event.category !== filter.category) return false;
    if (filter.year && yearOf(event.date) !== filter.year) return false;
    if (!q) return true;
    // Gesucht wird über das, was auf der Karte steht — Titel, Beschreibung,
    // Quelle und die genannten Personen.
    const haystack = [
      event.title,
      event.detail ?? "",
      event.sourceTitle,
      ...event.people,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
