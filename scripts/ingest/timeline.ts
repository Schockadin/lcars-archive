// scripts/ingest/timeline.ts
//
// Baut die Timeline rein deterministisch aus dem bereits importierten
// Datenbestand auf (kein Vault-Zugriff, kein LLM) — läuft nach den anderen
// Ingest-Schritten, weil es das schon gespeicherte source_md der vier
// Content-Tabellen liest (analog zu resolveWikiLinks in ./wikilinks.ts).
//
// Steuerung erfolgt ausschließlich über einen Kommentar-Marker im Markdown-
// Body, im gleichen Stil wie <!-- private -->:
//
//   <!-- timeline -->
//     Bare-Form: übernimmt Datum + Titel automatisch vom Eintrag selbst.
//     Nur erlaubt, wo ein natürliches Primärdatum existiert (Mission-Logs,
//     Archiv-Einträge). Bei Missionen und Charakteren nicht erlaubt.
//
//   <!-- timeline: 2400-09-20 | Titel -->
//   <!-- timeline: 2400-09-20 | Titel | Kategorie -->
//     Parametrisierte Form, überall gültig, auch mehrfach pro Datei.
//     Kategorie ist freier Text (keine Schema-Änderung nötig für neue
//     Kategorien) und steuert nur die Farbe auf der Timeline-Seite.
//
// Marker nach <!-- private --> werden ignoriert (splitPrivate), damit
// GM-only-Ereignisse nie auf der öffentlichen Timeline landen.
//
// Missionen erscheinen zusätzlich IMMER automatisch über started_at, ganz
// ohne Marker — eine Mission gilt per Definition als "wichtiges Ereignis".
import postgres from "postgres";
import { splitPrivate } from "../../src/lib/markdown.js";

type SourceType = "character" | "mission" | "mission_log" | "archive_entry";

interface TimelineEventInsert {
  event_date: string;
  title: string;
  category: string;
  source_type: SourceType;
  source_slug: string;
  href: string;
}

interface RawTag {
  date: string | null;
  title: string | null;
  category: string | null;
}

const TIMELINE_TAG_RE = /<!--\s*timeline(?:\s*:\s*(.+?))?\s*-->/g;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Alle <!-- timeline [...] -->-Marker im öffentlichen Teil eines Markdown-
// Bodys einsammeln. Bare-Marker liefern { date: null, title: null }.
function parseTimelineTags(sourceMd: string | null): RawTag[] {
  if (!sourceMd) return [];
  const publicMd = splitPrivate(sourceMd);

  const tags: RawTag[] = [];
  TIMELINE_TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TIMELINE_TAG_RE.exec(publicMd))) {
    const raw = match[1];
    if (raw == null) {
      tags.push({ date: null, title: null, category: null });
      continue;
    }
    const [date, title, category] = raw.split("|").map((p) => p.trim());
    tags.push({ date: date || null, title: title || null, category: category || null });
  }
  return tags;
}

interface ResolveContext {
  allowBare: boolean;
  fallbackDate: string | null;
  fallbackTitle: string;
  defaultCategory: string;
  sourceType: SourceType;
  sourceSlug: string;
  href: string;
}

// Einen rohen Tag gegen den Kontext des Eintrags auflösen (Bare-Form auffüllen,
// Datum/Titel validieren). Wirft bei ungültigen/unzulässigen Tags — der
// Aufrufer fängt pro Tag ab, damit ein einzelner Fehler nicht den ganzen
// Ingest-Lauf abbricht.
function resolveTag(tag: RawTag, ctx: ResolveContext): TimelineEventInsert {
  let date = tag.date;
  let title = tag.title;

  if (date == null && title == null) {
    if (!ctx.allowBare) {
      throw new Error(
        "Blosses <!-- timeline --> hier nicht erlaubt - nutze <!-- timeline: JJJJ-MM-TT | Titel -->",
      );
    }
    if (!ctx.fallbackDate) {
      throw new Error(
        "<!-- timeline --> ohne Angaben, aber kein Datum am Eintrag vorhanden",
      );
    }
    date = ctx.fallbackDate;
    title = ctx.fallbackTitle;
  }

  if (!date || !DATE_RE.test(date)) {
    throw new Error(`Ungueltiges Datum "${date ?? ""}" - erwartet JJJJ-MM-TT`);
  }
  if (!title?.trim()) {
    throw new Error("Titel fehlt in <!-- timeline: ... -->-Markierung");
  }

  return {
    event_date: date,
    title: title.trim(),
    category: tag.category?.trim() || ctx.defaultCategory,
    source_type: ctx.sourceType,
    source_slug: ctx.sourceSlug,
    href: ctx.href,
  };
}

export async function ingestTimeline(sql: postgres.Sql): Promise<void> {
  console.log("\n🕰  Timeline: baue Ereignisse neu auf");

  const events: TimelineEventInsert[] = [];
  const errors: string[] = [];

  // ── Missionen: automatisch über started_at + optionale Zusatz-Tags ──
  const missions = await sql<
    { slug: string; title: string; started_at: string | null; source_md: string | null }[]
  >`SELECT slug, title, started_at::text AS started_at, source_md FROM missions`;

  for (const m of missions) {
    if (m.started_at) {
      events.push({
        event_date: m.started_at,
        title: m.title,
        category: "mission",
        source_type: "mission",
        source_slug: m.slug,
        href: `/missions/${m.slug}`,
      });
    }
    for (const tag of parseTimelineTags(m.source_md)) {
      try {
        events.push(
          resolveTag(tag, {
            allowBare: false,
            fallbackDate: m.started_at,
            fallbackTitle: m.title,
            defaultCategory: "mission",
            sourceType: "mission",
            sourceSlug: m.slug,
            href: `/missions/${m.slug}`,
          }),
        );
      } catch (error) {
        errors.push(`  ✗ Mission "${m.slug}": ${msg(error)}`);
      }
    }
  }

  // ── Mission-Logs: nur explizite Tags (bare übernimmt log_date + Titel) ──
  const logs = await sql<
    {
      slug: string;
      title: string;
      log_date: string | null;
      mission_slug: string;
      source_md: string | null;
    }[]
  >`
    SELECT ml.slug, ml.title, ml.log_date::text AS log_date,
           m.slug AS mission_slug, ml.source_md
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
  `;

  for (const log of logs) {
    for (const tag of parseTimelineTags(log.source_md)) {
      try {
        events.push(
          resolveTag(tag, {
            allowBare: true,
            fallbackDate: log.log_date,
            fallbackTitle: log.title,
            defaultCategory: "log",
            sourceType: "mission_log",
            sourceSlug: log.slug,
            href: `/missions/${log.mission_slug}/${log.slug}`,
          }),
        );
      } catch (error) {
        errors.push(`  ✗ Mission-Log "${log.slug}": ${msg(error)}`);
      }
    }
  }

  // ── Archiv-Einträge: nur explizite Tags (bare übernimmt metadata.logDate) ──
  const archiveEntries = await sql<
    { slug: string; title: string; metadata: unknown; source_md: string | null }[]
  >`SELECT slug, title, metadata, source_md FROM archive_entries`;

  for (const entry of archiveEntries) {
    const metadata = (
      typeof entry.metadata === "string" ? JSON.parse(entry.metadata) : entry.metadata
    ) as { logDate?: string | null } | null;
    const logDate = metadata?.logDate ?? null;

    for (const tag of parseTimelineTags(entry.source_md)) {
      try {
        events.push(
          resolveTag(tag, {
            allowBare: true,
            fallbackDate: logDate,
            fallbackTitle: entry.title,
            defaultCategory: "archiv",
            sourceType: "archive_entry",
            sourceSlug: entry.slug,
            href: `/archive/${entry.slug}`,
          }),
        );
      } catch (error) {
        errors.push(`  ✗ Archiv-Eintrag "${entry.slug}": ${msg(error)}`);
      }
    }
  }

  // ── Charaktere: kein Datumsfeld am Eintrag → nur parametrisierte Tags ──
  const characters = await sql<
    { slug: string; name: string; source_md: string | null }[]
  >`SELECT slug, name, source_md FROM characters`;

  for (const c of characters) {
    for (const tag of parseTimelineTags(c.source_md)) {
      try {
        events.push(
          resolveTag(tag, {
            allowBare: false,
            fallbackDate: null,
            fallbackTitle: c.name,
            defaultCategory: "sonstiges",
            sourceType: "character",
            sourceSlug: c.slug,
            href: `/characters/${c.slug}`,
          }),
        );
      } catch (error) {
        errors.push(`  ✗ Charakter "${c.slug}": ${msg(error)}`);
      }
    }
  }

  // ── Komplett neu aufbauen (kleine Datenmenge, vermeidet Karteileichen) ──
  await sql`DELETE FROM timeline_events`;
  for (const e of events) {
    await sql`
      INSERT INTO timeline_events (
        event_date, title, category, source_type, source_slug, href
      ) VALUES (
        ${e.event_date}, ${e.title}, ${e.category},
        ${e.source_type}, ${e.source_slug}, ${e.href}
      )
    `;
  }

  console.log(`  → ${events.length} Ereignisse`);
  if (errors.length > 0) {
    console.error("\n  Hinweise:");
    errors.forEach((e) => console.error(e));
  }
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
