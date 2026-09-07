// Die Chronologie (/chronologie): Typen, Kategorien und die reinen Helfer.
//
// Bewusst OHNE `server-only` — die Ansicht ist eine Client-Komponente und
// braucht Kategorien, Sortierung und Gruppierung; der Datenzugriff liegt
// daneben in src/lib/timeline.ts. Dieselbe Aufteilung wie
// contentNoteTypes.ts/contentNotes.ts.

import { fmtDate } from "@/lib/missionFormat";
import { RESERVED_CHRONOLOGY_SEGMENTS } from "@/lib/contentRoutes";

export { fmtDate };

// Woher ein Ereignis stammt. Die Unterscheidung steht in der Ansicht, weil
// „vom Modell aus dem Text gelesen" etwas anderes ist als „so gepflegt":
//   metadata — aus den Feldern des Inhalts (Missionsdatum, Logbuch-Datum, …)
//   marker   — aus einem <!-- timeline: … -->-Marker im Fließtext
//   inferred — vom Sprachmodell aus dem Text abgeleitet (siehe
//              src/lib/timelineInference.ts), von der Spielleitung übernommen
//   manual   — von Hand eingetragen, ohne zugehörigen Inhalt (ein
//              Kampagnen-Meilenstein, der in keinem Eintrag steht)
export type TimelineOrigin = "metadata" | "marker" | "inferred" | "manual";

export const ORIGIN_LABELS: Record<TimelineOrigin, string> = {
  metadata: "aus den Angaben des Eintrags",
  marker: "im Text markiert",
  inferred: "aus dem Text abgeleitet",
  manual: "von Hand eingetragen",
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
  // Wohin die Karte führt — null bei einem von Hand eingetragenen Ereignis:
  // es hat keinen Inhalt, auf den zu zeigen wäre (origin "manual").
  href: string | null;
  // Nur an den beiden gepflegten Missions-Ereignissen: ob dies der Beginn
  // oder der Abschluss des Einsatzes ist. Die Standardansicht der Chronologie
  // zeigt genau die Starts (siehe TIMELINE_SCOPES) — sie sind das, was die
  // frühere Missions-Übersicht war.
  phase?: "start" | "end";
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

// Ein Zeitstrahl wird nach dem Datum geordnet, sonst ist er keiner — die
// Richtung ist das Einzige, was hier zur Wahl steht. Eine zweite Ordnung nach
// Ereignisart gab es kurzzeitig; sie stellte die Karten quer zu den
// Monats-Trennern und ist wieder entfallen. Wer eine Art für sich sehen will,
// filtert danach (/chronologie/[kategorie]).
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

// Alle Jahre, in denen mindestens ein Ereignis liegt — NEUESTE ZUERST, wie die
// Liste darunter in ihrer Voreinstellung.
//
// Die Jahresleiste wird bewusst aus den bereits nach Suche und Ereignisart
// gefilterten Ereignissen gebaut (siehe TimelineView): ein Jahr anzubieten,
// das mit den übrigen Filtern keinen einzigen Treffer hat, führt nur in eine
// leere Liste.
export function yearsOf(events: TimelineEvent[]): string[] {
  return [...new Set(events.map((e) => yearOf(e.date)))].sort().reverse();
}

// Der Umfang der Ansicht. Die Chronologie ist seit dem Zusammenlegen mit der
// Missions-Übersicht beides: in der Vorgabe eine Liste der Einsätze (je ein
// Eintrag, der auf die Missionsseite führt), auf Wunsch der volle Zeitstrahl
// mit Logbüchern, Marken und abgeleiteten Ereignissen. Wer die Kampagne
// überfliegen will, soll nicht erst filtern müssen.
export const TIMELINE_SCOPES = [
  { key: "missions", label: "Missionen" },
  { key: "all", label: "Alle Ereignisse" },
] as const;

export type TimelineScope = (typeof TIMELINE_SCOPES)[number]["key"];

export const DEFAULT_TIMELINE_SCOPE: TimelineScope = "missions";

export function isMissionStart(event: TimelineEvent): boolean {
  return event.sourceType === "mission" && event.phase === "start";
}

// Die Kategorie-Routen (/chronologie/[kategorie], siehe contentRoutes.ts)
// nehmen genau die bekannten Ereignisarten an — ein unbekanntes Segment ist
// eine 404 und keine leere Liste, sonst sähe jeder Tippfehler wie eine
// Kampagne ohne Ereignisse aus. Die Umfänge sind gesperrt, weil sie in
// derselben Ebene liegen (RESERVED_CHRONOLOGY_SEGMENTS).
export function isTimelineCategory(value: string): value is TimelineCategory {
  return (
    !RESERVED_CHRONOLOGY_SEGMENTS.includes(value) &&
    EVENT_CATEGORIES.some((c) => c.key === value)
  );
}

// Das Ende je Mission, nach der Adresse der Missionsseite geschlüsselt
// (Beginn und Abschluss tragen dieselbe). Damit trägt der Umfang „Missionen"
// je Einsatz EINE Karte mit dem ganzen Zeitraum, statt nur den Beginn zu
// zeigen — das Wort „Missionen" meint dort die Einsätze, das Wort „Mission"
// im Ereignisart-Filter dagegen die einzelnen Marker (Beginn UND Abschluss).
// Ohne diese Trennung standen zwei gleich klingende Bedienelemente für
// Verschiedenes.
export function missionEndDates(events: TimelineEvent[]): Map<string, string> {
  const ends = new Map<string, string>();
  for (const event of events) {
    if (event.sourceType === "mission" && event.phase === "end" && event.href) {
      ends.set(event.href, event.date);
    }
  }
  return ends;
}

// Alle Beteiligten, die in diesen Ereignissen vorkommen — alphabetisch, für
// die Auswahlliste. Ohne Datum gepflegte Figuren tauchen hier nicht auf, das
// ist gewollt: die Liste soll nur zeigen, wonach sich filtern lässt.
export function peopleOf(events: TimelineEvent[]): string[] {
  const names = new Set<string>();
  for (const event of events) for (const name of event.people) names.add(name);
  return [...names].sort((a, b) => a.localeCompare(b, "de"));
}

// Filter der Ansicht. Als reine Funktion, damit die Kombination aus Umfang,
// Suche, Kategorie, Beteiligten und Jahr für sich prüfbar ist.
export interface TimelineFilter {
  query: string;
  category: string | null;
  year: string | null;
  scope?: TimelineScope;
  person?: string | null;
}

export function filterEvents(
  events: TimelineEvent[],
  filter: TimelineFilter,
): TimelineEvent[] {
  const q = filter.query.trim().toLowerCase();
  const scope = filter.scope ?? "all";
  return events.filter((event) => {
    if (scope === "missions" && !isMissionStart(event)) return false;
    if (filter.person && !event.people.includes(filter.person)) return false;
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
