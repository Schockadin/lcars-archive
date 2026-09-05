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
// Maskiert die LIKE/ILIKE-Sonderzeichen (%, _ und der Standard-Escape-
// Backslash selbst) im FREITEXT des Users, damit sie als literale Zeichen
// gesucht werden statt als Platzhalter. Ohne das würde z.B. die Suche nach
// „50%" jeden Text mit „50" gefolgt von Beliebigem treffen und „_" jedes
// einzelne Zeichen. Die umschließenden %…%-Platzhalter (siehe unten) sind
// bewusst NICHT Teil des maskierten Strings. Der Wert wird ohnehin als
// gebundener Parameter übergeben (kein SQL-Injection-Thema) — hier geht es
// rein um die Muster-Semantik.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function runSearchQueries(
  q: string,
  opts: { includeContent: boolean; limit: number },
): Promise<RawRows> {
  const escaped = escapeLikePattern(q);
  const like = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const { includeContent, limit } = opts;

  // Volltext-Anfrage aus der Nutzereingabe. websearch_to_tsquery versteht die
  // von Suchmaschinen gewohnte Syntax (mehrere Wörter = UND, "in
  // Anführungszeichen" = Phrase, -wort = Ausschluss) und wirft bei
  // wirrer Eingabe KEINEN Fehler — anders als to_tsquery, das an einem
  // einzelnen Sonderzeichen scheitern würde.
  //
  // FTS und ILIKE ergänzen sich bewusst, statt sich abzulösen:
  //   FTS   findet Wortformen („Gespräche" → „Gespräch Eins") und mehrere
  //         Wörter in beliebiger Reihenfolge; liefert außerdem die Relevanz.
  //   ILIKE findet Teilwörter und Fragmente („espräch", „T'Le"), an denen die
  //         Wort-Tokenisierung der FTS vorbeigeht — und trägt die Live-Suche,
  //         die schon nach zwei Buchstaben etwas anzeigen soll.
  const ts = sql`websearch_to_tsquery('german', ${q})`;

  // Welcher Vektor befragt wird, hängt am Modus: Die Live-Suche (Dropdown)
  // vergleicht wie bisher NUR Titel/Namen — sonst würde sie plötzlich auch
  // Fließtext treffen. Die Volltextsuche nutzt den vollen Vektor (Titel +
  // Inhalt). Beide sind eigene, indizierte Spalten (siehe schema.sql).
  const vec = (col: string) =>
    includeContent ? sql`${sql(col)}.search_vector` : sql`${sql(col)}.title_vector`;

  const [chars, missions, logs, archive] = await Promise.all([
    sql<CharacterRow[]>`
      SELECT name, slug
      FROM characters
      WHERE (name ILIKE ${like} OR ${vec("characters")} @@ ${ts})
        AND visibility = 'public' AND deleted_at IS NULL
        AND is_draft = false
      ORDER BY (name ILIKE ${prefix}) DESC,
               ts_rank_cd(${vec("characters")}, ${ts}) DESC,
               name ASC
      LIMIT ${limit}
    `,
    sql<MissionRow[]>`
      SELECT title, slug
      FROM missions
      WHERE (title ILIKE ${like} OR ${vec("missions")} @@ ${ts})
        AND deleted_at IS NULL AND is_draft = false
      ORDER BY (title ILIKE ${prefix}) DESC,
               ts_rank_cd(${vec("missions")}, ${ts}) DESC,
               title ASC
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
          OR ${vec("ml")} @@ ${ts}
        )
        AND ml.visibility = 'public'
        AND ml.deleted_at IS NULL AND m.deleted_at IS NULL AND ml.is_draft = false
      ORDER BY (ml.title ILIKE ${prefix}) DESC,
               ts_rank_cd(${vec("ml")}, ${ts}) DESC,
               ml.title ASC
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
          OR ${vec("archive_entries")} @@ ${ts}
        )
        AND NOT (category = 'dialogue' AND dialogue_open)
        AND visibility = 'public'
        AND deleted_at IS NULL AND is_draft = false
      ORDER BY (title ILIKE ${prefix}) DESC,
               ts_rank_cd(${vec("archive_entries")}, ${ts}) DESC,
               title ASC
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

// Zerlegt die Eingabe in Suchwörter. Anführungszeichen und die von
// websearch_to_tsquery unterstützten Operatoren (-wort, or) werden entfernt —
// hier geht es nur darum, welche WÖRTER im Text hervorgehoben werden sollen.
export function searchTerms(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/["']/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^-/, ""))
    .filter((t) => t.length > 0 && t !== "or");
}

// Kürzeste Wortform, die noch als Treffer durchgeht. Verhindert, dass aus
// „die" ein Präfix-Treffer auf jedes „di…" wird.
const MIN_STEM_LENGTH = 4;

// Sucht die Fundstelle, die im Ausschnitt hervorgehoben wird. Seit die Suche
// über den Volltextindex läuft, kann ein Treffer auf einer WORTFORM beruhen
// („Gespräche" findet „Gespräch Eins") — die wörtliche Eingabe steht dann gar
// nicht im Text. Deshalb in drei Stufen:
//   1. die vollständige Eingabe,
//   2. jedes einzelne Suchwort,
//   3. der Wortstamm-Präfix jedes Suchworts (schrittweise gekürzt).
// Ohne Stufe 3 blieben genau die Treffer ohne Ausschnitt, die der neue Index
// überhaupt erst gefunden hat.
export function findSnippetMatch(
  plainText: string,
  q: string,
): { index: number; text: string } | undefined {
  const hay = plainText.toLowerCase();

  const direct = hay.indexOf(q.toLowerCase().trim());
  if (q.trim() && direct !== -1) {
    return { index: direct, text: plainText.slice(direct, direct + q.trim().length) };
  }

  const terms = searchTerms(q);
  for (const term of terms) {
    const i = hay.indexOf(term);
    if (i !== -1) return { index: i, text: plainText.slice(i, i + term.length) };
  }
  for (const term of terms) {
    for (let len = term.length - 1; len >= MIN_STEM_LENGTH; len--) {
      const stem = term.slice(0, len);
      const i = hay.indexOf(stem);
      if (i !== -1) {
        // Bis zum Wortende ausdehnen, damit der Ausschnitt das ganze Wort
        // zeigt („Gespräch") und nicht den abgeschnittenen Stamm.
        const rest = /^[\p{L}\p{N}]*/u.exec(plainText.slice(i + len))?.[0] ?? "";
        return { index: i, text: plainText.slice(i, i + len + rest.length) };
      }
    }
  }
  return undefined;
}

// Zentrierter Ausschnitt (~120 Zeichen) um den ersten Treffer, mit Ellipsen
// an abgeschnittenen Rändern. undefined wenn im Text nichts gefunden wird —
// die Zeile wird dann als reiner Titel-Treffer angezeigt.
export function buildSnippet(
  plainText: string,
  q: string,
  radius = 60,
): string | undefined {
  const flat = plainText.replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  const hit = findSnippetMatch(flat, q);
  if (!hit) return undefined;
  const start = Math.max(0, hit.index - radius);
  const end = Math.min(flat.length, hit.index + hit.text.length + radius);
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
    const plain = opts.includeContent ? plainTextFor(l) : "";
    const snippet =
      opts.includeContent && !matchesQuery(l.title, q)
        ? buildSnippet(plain, q)
        : undefined;
    // Sprungmarke auf die TATSÄCHLICH gefundene Stelle: bei einem Treffer über
    // eine Wortform steht die wörtliche Eingabe nicht im Text, ein Fragment
    // daraus würde ins Leere zeigen.
    const hit = snippet ? findSnippetMatch(plain, q) : undefined;
    return {
      type: "log" as const,
      label: l.title,
      sublabel: `Log · ${l.mission_title}`,
      href: `/missions/${l.mission_slug}/${l.slug}${hit ? `#:~:text=${toTextFragment(hit.text)}` : ""}`,
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
    const archiveHit = snippet
      ? findSnippetMatch(plainTextFor(a), q)
      : undefined;
    return {
      type: "archive" as const,
      label:
        a.category === "dialogue"
          ? a.title?.trim() ||
            (a.setting ? `Gespräch auf ${a.setting}` : "Gespräch")
          : a.title,
      sublabel: CATEGORY_CONFIG[a.category]?.label ?? "Datenbank",
      href: `/archive/${a.slug}${archiveHit ? `#:~:text=${toTextFragment(archiveHit.text)}` : ""}`,
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
