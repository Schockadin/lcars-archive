import "server-only";
import sql from "@/lib/db";
import { WIKILINK_RE } from "@/lib/markdown";
import { slugifyBase } from "@/lib/slug";
import { normalizeWikilinkTarget } from "@/lib/autolink";
import { canView, type Viewer, type Visibility } from "@/lib/visibility";

// „Erwähnt in" für Charaktere, Missionen und Logbücher.
//
// Bisher gab es eingehende Verweise nur für Archiv-Einträge, weil sie über die
// Tabelle archive_links laufen — die aber ausschließlich Archiv↔Archiv
// verbindet. Verweise AUF Charaktere/Missionen/Logs entstehen an zwei anderen
// Stellen, die hier beide ausgewertet werden:
//
//   1. Strukturierte Verweisfelder: archive_entries.metadata trägt die
//      aufgelösten Referenzen als {kind,name,slug}-Listen unter
//      characters/missions/participants (siehe saveArchiveReferences in
//      archive.ts). Die werden per jsonb-Containment gefunden — exakt und
//      indizierbar.
//   2. Wikilinks im Fließtext ([[Ziel]]). Die lösen sich über slugifyBase des
//      Linktextes auf (siehe autolink.ts), lassen sich in SQL also nicht
//      zuverlässig vergleichen. Deshalb ein zweistufiges Vorgehen: die
//      Datenbank filtert per ILIKE auf den Anzeigenamen vor (nutzt die
//      vorhandenen Trigramm-Indizes), die eigentliche Prüfung macht JS mit
//      derselben Regex und derselben slugify-Funktion wie beim Rendern. Damit
//      gibt es keine Falschtreffer durch bloßes Namens-Vorkommen im Text.
//
// Sichtbarkeit wird bewusst in JS über canView() gefiltert (gleiches Muster
// wie im Rest des Projekts): so sehen GM und Admin auch nicht-öffentliche
// Erwähnungen, alle anderen nur öffentliche.

export type MentionKind = "archive" | "mission" | "log";

export interface Mention {
  kind: MentionKind;
  slug: string;
  title: string;
  // Kurze Typ-/Kontextangabe für die Anzeige („Datenbank · NPC", „Logbuch · …").
  sublabel: string;
  href: string;
}

export interface MentionTarget {
  slug: string;
  // Anzeigename — nur für den ILIKE-Vorfilter der Wikilink-Suche.
  name: string;
}

interface CandidateRow {
  slug: string;
  title: string;
  visibility: Visibility | null;
  owner_user_id: number | null;
  source_md: string | null;
  structured: boolean;
}

// Die rohen Ziele aller Wikilinks eines Markdown-Textes ([[Ziel|Text]] und
// [[Ziel#Abschnitt]] → "Ziel"). Nutzt dieselbe Regex wie die Render-Pipeline.
export function wikilinkTargets(sourceMd: string): string[] {
  const out: string[] = [];
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(sourceMd))) {
    const target = m[1]?.trim();
    if (target) out.push(target);
  }
  WIKILINK_RE.lastIndex = 0;
  return out;
}

// Zeigt einer dieser Wikilinks auf das gesuchte Ziel?
//
// Spiegelt bewusst die Auflösung des Renderers (resolveAllWikilinks in
// autolink.ts): dort gewinnt zuerst der TITEL-Vergleich (normalisiert auf
// trim+lowercase), erst danach greift der Slug als Rückfallebene. Würde hier
// nur slugifiziert, blieben genau die Verweise unentdeckt, deren Titel sich
// nicht in ihren Slug übersetzt („Log Eins" → Slug „log-1").
export function wikilinkPointsTo(
  sourceMd: string,
  target: { slug: string; name: string },
): boolean {
  const wantedTitle = normalizeWikilinkTarget(target.name);
  return wikilinkTargets(sourceMd).some(
    (raw) =>
      normalizeWikilinkTarget(raw) === wantedTitle ||
      slugifyBase(raw) === target.slug,
  );
}

// Zählt eine Kandidatenzeile als echte Erwähnung? Strukturierte Treffer immer,
// Textreffer nur, wenn dort tatsächlich ein Wikilink auf dieses Ziel steht.
function isRealMention(row: CandidateRow, target: MentionTarget): boolean {
  if (row.structured) return true;
  return wikilinkPointsTo(row.source_md ?? "", target);
}

export async function getMentionsOf(
  target: MentionTarget,
  viewer: Viewer | null,
): Promise<Mention[]> {
  // WICHTIG: sql.json() statt eines JSON-Strings. Wird der Wert als String
  // gebunden, wertet Postgres das @>-Containment nicht als jsonb aus und die
  // Abfrage liefert stumm NULL Treffer (nachgemessen: 0 statt 2) — obwohl
  // dieselbe Abfrage mit Literal korrekt funktioniert. sql.json ist auch die
  // im Projekt sonst genutzte Form (siehe advancementSettings.ts).
  const ref = sql.json([
    { slug: target.slug },
  ] as unknown as ReturnType<typeof JSON.parse>);
  const nameLike = `%${target.name}%`;

  const [archiveRows, missionRows, logRows] = await Promise.all([
    sql<(CandidateRow & { category: string })[]>`
      SELECT slug, title, category, visibility, owner_user_id, source_md,
             (metadata->'characters' @> ${ref}
              OR metadata->'missions' @> ${ref}
              OR metadata->'participants' @> ${ref}) AS structured
      FROM archive_entries
      WHERE deleted_at IS NULL AND is_draft = false
        AND (
          metadata->'characters' @> ${ref}
          OR metadata->'missions' @> ${ref}
          OR metadata->'participants' @> ${ref}
          OR source_md ILIKE ${nameLike}
        )
      ORDER BY title ASC
    `,
    // Missionen haben keine visibility-Spalte — nur Entwurf/gelöscht filtern.
    sql<CandidateRow[]>`
      SELECT slug, title, NULL::text AS visibility, owner_user_id, source_md,
             false AS structured
      FROM missions
      WHERE deleted_at IS NULL AND is_draft = false
        AND source_md ILIKE ${nameLike}
      ORDER BY title ASC
    `,
    sql<(CandidateRow & { mission_slug: string; mission_title: string })[]>`
      SELECT ml.slug, ml.title, ml.visibility, ml.owner_user_id, ml.source_md,
             false AS structured,
             m.slug AS mission_slug, m.title AS mission_title
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id
      WHERE ml.deleted_at IS NULL AND m.deleted_at IS NULL AND ml.is_draft = false
        AND ml.source_md ILIKE ${nameLike}
      ORDER BY ml.title ASC
    `,
  ]);

  const mentions: Mention[] = [];

  for (const row of archiveRows) {
    if (row.slug === target.slug) continue;
    if (!isRealMention(row, target)) continue;
    if (!canView(row.visibility ?? "public", row.owner_user_id, viewer)) continue;
    mentions.push({
      kind: "archive",
      slug: row.slug,
      title: row.title,
      sublabel: "Datenbank",
      href: `/archive/${row.slug}`,
    });
  }

  for (const row of missionRows) {
    if (!isRealMention(row, target)) continue;
    mentions.push({
      kind: "mission",
      slug: row.slug,
      title: row.title,
      sublabel: "Mission",
      href: `/missions/${row.slug}`,
    });
  }

  for (const row of logRows) {
    if (!isRealMention(row, target)) continue;
    if (!canView(row.visibility ?? "public", row.owner_user_id, viewer)) continue;
    mentions.push({
      kind: "log",
      slug: row.slug,
      title: row.title,
      sublabel: `Logbuch · ${row.mission_title}`,
      href: `/missions/${row.mission_slug}/${row.slug}`,
    });
  }

  return mentions;
}
