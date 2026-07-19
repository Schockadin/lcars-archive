import sql from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import { WIKILINK_RE } from "@/lib/markdown";
import type { ArchiveCategory } from "@/types/archive";
import type { SearchResult, SearchResultType } from "@/types/search";
import type { FollowTargetType } from "@/lib/follows";

const LIVE_PER_TYPE_LIMIT = 6;
// Großzügige Sicherheitsgrenze statt echter Pagination — im Repo gibt es
// kein Pagination-Pattern, und der Datensatz (Fan-Archiv) ist klein genug,
// dass eine feste Obergrenze pro Typ ausreicht.
const FULL_PER_TYPE_LIMIT = 100;

interface CharacterRow {
  name: string;
  slug: string;
}
interface MissionRow {
  title: string;
  slug: string;
}
interface LogRow {
  title: string;
  slug: string;
  mission_slug: string;
  mission_title: string;
  // Nur selektiert, wenn includeContent (Volltextsuche) — für die
  // Live-Suche unnötiger Ballast, siehe runSearchQueries().
  content?: string;
  source_md?: string | null;
}
interface ArchiveRow {
  title: string;
  slug: string;
  category: ArchiveCategory;
  setting: string | null;
  content?: string;
  source_md?: string | null;
}

interface RawRows {
  chars: CharacterRow[];
  missions: MissionRow[];
  logs: LogRow[];
  archive: ArchiveRow[];
}

// Führt die 4 Such-Queries parallel aus. `includeContent` steuert sowohl die
// WHERE-Klausel (Volltext-Treffer ja/nein) als auch, ob content/source_md
// überhaupt mitselektiert werden — die Live-Suche (Dropdown, pro Tastendruck)
// braucht sie nie, da sie nur Titel vergleicht.
async function runSearchQueries(
  q: string,
  opts: { includeContent: boolean; limit: number },
): Promise<RawRows> {
  const like = `%${q}%`;
  const prefix = `${q}%`;
  const { includeContent, limit } = opts;

  const [chars, missions, logs, archive] = await Promise.all([
    sql<CharacterRow[]>`
      SELECT name, slug
      FROM characters
      WHERE name ILIKE ${like} AND visibility = 'public' AND deleted_at IS NULL
      ORDER BY (name ILIKE ${prefix}) DESC, name ASC
      LIMIT ${limit}
    `,
    sql<MissionRow[]>`
      SELECT title, slug
      FROM missions
      WHERE title ILIKE ${like} AND deleted_at IS NULL
      ORDER BY (title ILIKE ${prefix}) DESC, title ASC
      LIMIT ${limit}
    `,
    sql<LogRow[]>`
      SELECT ml.title, ml.slug, m.slug AS mission_slug, m.title AS mission_title
             ${includeContent ? sql`, ml.content, ml.source_md` : sql``}
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id
      WHERE (
          ml.title ILIKE ${like}
          ${includeContent ? sql`OR ml.content ILIKE ${like}` : sql``}
        )
        AND ml.visibility = 'public'
        AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
      ORDER BY (ml.title ILIKE ${prefix}) DESC, ml.title ASC
      LIMIT ${limit}
    `,
    sql<ArchiveRow[]>`
      SELECT title, slug, category, metadata->>'setting' AS setting
             ${includeContent ? sql`, content, source_md` : sql``}
      FROM archive_entries
      WHERE (
          title ILIKE ${like}
          ${includeContent ? sql`OR content ILIKE ${like}` : sql``}
          OR (category = 'dialogue' AND metadata->>'setting' ILIKE ${like})
        )
        AND NOT (category = 'dialogue' AND dialogue_open)
        AND visibility = 'public'
        AND deleted_at IS NULL
      ORDER BY (title ILIKE ${prefix}) DESC, title ASC
      LIMIT ${limit}
    `,
  ]);

  return { chars, missions, logs, archive };
}

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

// Text-Fragment-Direktive (#:~:text=…) für den Browser: springt beim Öffnen
// des Links direkt zur (ersten) Fundstelle im gerenderten Inhalt und hebt
// sie hervor — dieselbe Stelle, die buildSnippet() unten anzeigt, da beide
// auf demselben indexOf()-Prinzip (erste Fundstelle) beruhen. "-" wird von
// encodeURIComponent nicht kodiert, muss aber laut Spec escaped werden, da
// es als Trenner der Fragment-Syntax reserviert ist.
function toTextFragment(text: string): string {
  return encodeURIComponent(text).replaceAll("-", "%2D");
}

// Reduziert rohes Markdown zu Fließtext für Snippets. Kein vollwertiger
// Parser — deckt nur ab, was im Korpus vorkommt (siehe scripts/ingest/*):
// Codeblöcke/Inline-Code, Bilder, Wikilinks (WIKILINK_RE — dieselbe Regex wie
// in der echten Markdown→HTML-Pipeline, damit z.B. [[Ziel#Abschnitt]] genauso
// aufgelöst wird wie beim Rendern), normale Links, Überschriften-/Zitat-/
// Listen-Marker, Betonung, Trennlinien.
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(WIKILINK_RE, (_, target: string, alias?: string) =>
      (alias ?? target).trim(),
    )
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*([-*_]\s*){3,}$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Zentrierter Ausschnitt (~120 Zeichen) um den ersten Treffer, mit Ellipsen
// an abgeschnittenen Rändern. undefined wenn q nach dem Stripping nicht
// (mehr) vorkommt — die Zeile wird dann als reiner Titel-Treffer angezeigt.
export function buildSnippet(
  plainText: string,
  q: string,
  radius = 60,
): string | undefined {
  const flat = plainText.replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  const idx = flat.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return undefined;
  const start = Math.max(0, idx - radius);
  const end = Math.min(flat.length, idx + q.length + radius);
  const excerpt = flat.slice(start, end).trim();
  return (start > 0 ? "…" : "") + excerpt + (end < flat.length ? "…" : "");
}

// Text-Basis für den Ausschnitt: source_md bevorzugt (rohes Markdown, kein
// HTML), sonst stripHtml(content) als Fallback für Zeilen ohne source_md.
// Wird nur aufgerufen, wenn includeContent die Spalten auch selektiert hat.
function plainTextFor(row: {
  content?: string;
  source_md?: string | null;
}): string {
  if (row.source_md) return stripMarkdown(row.source_md);
  return row.content ? stripHtml(row.content) : "";
}

function mapResults(
  rows: RawRows,
  q: string,
  opts: { includeContent: boolean },
): SearchResult[] {
  const { chars, missions, logs, archive } = rows;

  const characterResults: SearchResult[] = chars.map((c) => ({
    type: "character" as const,
    label: c.name,
    sublabel: "Charakter",
    href: `/characters/${c.slug}`,
    slug: c.slug,
  }));

  const missionResults: SearchResult[] = missions.map((m) => ({
    type: "mission" as const,
    label: m.title,
    sublabel: "Mission",
    href: `/missions/${m.slug}`,
    slug: m.slug,
  }));

  const logResults: SearchResult[] = logs.map((l) => {
    const snippet =
      opts.includeContent && !matchesQuery(l.title, q)
        ? buildSnippet(plainTextFor(l), q)
        : undefined;
    return {
      type: "log" as const,
      label: l.title,
      sublabel: `Log · ${l.mission_title}`,
      href: `/missions/${l.mission_slug}/${l.slug}${snippet ? `#:~:text=${toTextFragment(q)}` : ""}`,
      slug: l.slug,
      snippet,
    };
  });

  const archiveResults: SearchResult[] = archive.map((a) => {
    const titleForMatch =
      a.category === "dialogue" ? (a.setting ?? "") : a.title;
    const snippet =
      opts.includeContent && !matchesQuery(titleForMatch, q)
        ? buildSnippet(plainTextFor(a), q)
        : undefined;
    return {
      type: "archive" as const,
      label:
        a.category === "dialogue"
          ? a.setting
            ? `Gespräch auf ${a.setting}`
            : "Gespräch"
          : a.title,
      sublabel: CATEGORY_CONFIG[a.category]?.label ?? "Archiv",
      href: `/archive/${a.slug}${snippet ? `#:~:text=${toTextFragment(q)}` : ""}`,
      slug: a.slug,
      snippet,
    };
  });

  return [
    ...characterResults,
    ...missionResults,
    ...logResults,
    ...archiveResults,
  ];
}

// Mission-Logs sind nicht bookmarkbar (siehe FollowTargetType), daher kein
// Eintrag für "log".
const TARGET_TYPE_FOR: Partial<Record<SearchResultType, FollowTargetType>> = {
  character: "character",
  mission: "mission",
  archive: "archive_entry",
};

// Markiert Treffer, die der User bereits gebookmarkt hat (für den
// "Gespeichert"-Filter auf /search). Eigene, schlanke Abfrage statt
// getBookmarkedContent() aus lib/follows.ts — die Sichtbarkeits-Joins dort
// sind hier unnötig, da runSearchQueries() bereits nur sichtbare Treffer
// liefert.
async function annotateSaved(
  results: SearchResult[],
  userId: number,
): Promise<SearchResult[]> {
  const rows = await sql<{ target_type: string; target_slug: string }[]>`
    SELECT target_type, target_slug FROM content_follows
    WHERE user_id = ${userId} AND bookmarked_at IS NOT NULL
  `;
  const saved = new Set(rows.map((r) => `${r.target_type}:${r.target_slug}`));
  return results.map((r) => {
    const targetType = TARGET_TYPE_FOR[r.type];
    if (!targetType) return r;
    return { ...r, saved: saved.has(`${targetType}:${r.slug}`) };
  });
}

// Ein Modus, eine Quelle der Wahrheit für includeContent/limit — verhindert,
// dass runSearchQueries() und mapResults() für denselben Aufruf versehentlich
// unterschiedliche includeContent-Werte bekommen.
async function search(
  q: string,
  mode: "live" | "full",
  userId?: number,
): Promise<SearchResult[]> {
  const includeContent = mode === "full";
  const limit = mode === "full" ? FULL_PER_TYPE_LIMIT : LIVE_PER_TYPE_LIMIT;
  const rows = await runSearchQueries(q, { includeContent, limit });
  const results = mapResults(rows, q, { includeContent });
  return userId != null ? annotateSaved(results, userId) : results;
}

// Live-Dropdown im Header — reine Titelsuche (inkl. Schauplatz als
// Titel-Ersatz bei Gesprächen), niedriges Limit.
export function searchLive(q: string): Promise<SearchResult[]> {
  return search(q, "live");
}

// Volltextsuche für die eigene Suchseite (/search) — Titel UND Inhalt,
// großzügiges Limit, mit Snippet für reine Volltext-Treffer. userId (falls
// eingeloggt) markiert bereits gebookmarkte Treffer für den
// "Gespeichert"-Filter.
export function searchFull(
  q: string,
  userId?: number,
): Promise<SearchResult[]> {
  return search(q, "full", userId);
}
