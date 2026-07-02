import sql from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import type { ArchiveCategory } from "@/types/archive";
import type { SearchResult } from "@/types/search";

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
  content: string;
  source_md: string | null;
}
interface ArchiveRow {
  title: string;
  slug: string;
  category: ArchiveCategory;
  setting: string | null;
  content: string;
  source_md: string | null;
}

interface RawRows {
  chars: CharacterRow[];
  missions: MissionRow[];
  logs: LogRow[];
  archive: ArchiveRow[];
}

// Führt die 4 Such-Queries parallel aus. `includeContent` steuert nur die
// WHERE-Klausel (Volltext-Treffer ja/nein) — content/source_md werden für
// logs/archive immer mitselektiert, damit mapResults() bei Bedarf einen
// Snippet berechnen kann, ohne die Spaltenliste dynamisch bauen zu müssen.
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
      WHERE name ILIKE ${like}
      ORDER BY (name ILIKE ${prefix}) DESC, name ASC
      LIMIT ${limit}
    `,
    sql<MissionRow[]>`
      SELECT title, slug
      FROM missions
      WHERE title ILIKE ${like}
      ORDER BY (title ILIKE ${prefix}) DESC, title ASC
      LIMIT ${limit}
    `,
    sql<LogRow[]>`
      SELECT ml.title, ml.slug, ml.content, ml.source_md,
             m.slug AS mission_slug, m.title AS mission_title
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id
      WHERE ml.title ILIKE ${like}
        ${includeContent ? sql`OR ml.content ILIKE ${like}` : sql``}
      ORDER BY (ml.title ILIKE ${prefix}) DESC, ml.title ASC
      LIMIT ${limit}
    `,
    sql<ArchiveRow[]>`
      SELECT title, slug, category, content, source_md,
             metadata->>'setting' AS setting
      FROM archive_entries
      WHERE title ILIKE ${like}
        ${includeContent ? sql`OR content ILIKE ${like}` : sql``}
        OR (category = 'dialogue' AND metadata->>'setting' ILIKE ${like})
      ORDER BY (title ILIKE ${prefix}) DESC, title ASC
      LIMIT ${limit}
    `,
  ]);

  return { chars, missions, logs, archive };
}

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

// Reduziert rohes Markdown zu Fließtext für Snippets. Kein vollwertiger
// Parser — deckt nur ab, was im Korpus vorkommt (siehe scripts/ingest/*):
// Codeblöcke/Inline-Code, Bilder, Wikilinks [[Ziel]]/[[Ziel|Text]], normale
// Links, Überschriften-/Zitat-/Listen-Marker, Betonung, Trennlinien.
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
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
function plainTextFor(row: { content: string; source_md: string | null }): string {
  return row.source_md ? stripMarkdown(row.source_md) : stripHtml(row.content);
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
  }));

  const missionResults: SearchResult[] = missions.map((m) => ({
    type: "mission" as const,
    label: m.title,
    sublabel: "Mission",
    href: `/missions/${m.slug}`,
  }));

  const logResults: SearchResult[] = logs.map((l) => ({
    type: "log" as const,
    label: l.title,
    sublabel: `Log · ${l.mission_title}`,
    href: `/missions/${l.mission_slug}/${l.slug}`,
    snippet:
      opts.includeContent && !matchesQuery(l.title, q)
        ? buildSnippet(plainTextFor(l), q)
        : undefined,
  }));

  const archiveResults: SearchResult[] = archive.map((a) => {
    const titleForMatch = a.category === "dialogue" ? (a.setting ?? "") : a.title;
    return {
      type: "archive" as const,
      label:
        a.category === "dialogue"
          ? a.setting
            ? `Gespräch auf ${a.setting}`
            : "Gespräch"
          : a.title,
      sublabel: CATEGORY_CONFIG[a.category]?.label ?? "Archiv",
      href: `/archive/${a.slug}`,
      snippet:
        opts.includeContent && !matchesQuery(titleForMatch, q)
          ? buildSnippet(plainTextFor(a), q)
          : undefined,
    };
  });

  return [...characterResults, ...missionResults, ...logResults, ...archiveResults];
}

// Live-Dropdown im Header — reine Titelsuche (inkl. Schauplatz als
// Titel-Ersatz bei Gesprächen), niedriges Limit.
export async function searchLive(q: string): Promise<SearchResult[]> {
  const rows = await runSearchQueries(q, {
    includeContent: false,
    limit: LIVE_PER_TYPE_LIMIT,
  });
  return mapResults(rows, q, { includeContent: false });
}

// Volltextsuche für die eigene Suchseite (/search) — Titel UND Inhalt,
// großzügiges Limit, mit Snippet für reine Volltext-Treffer.
export async function searchFull(q: string): Promise<SearchResult[]> {
  const rows = await runSearchQueries(q, {
    includeContent: true,
    limit: FULL_PER_TYPE_LIMIT,
  });
  return mapResults(rows, q, { includeContent: true });
}
