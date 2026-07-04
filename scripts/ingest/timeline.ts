// scripts/ingest/timeline.ts
//
// Baut die Timeline rein deterministisch aus dem bereits importierten
// Datenbestand auf (kein Vault-Zugriff, kein LLM) — läuft nach den anderen
// Ingest-Schritten, weil es das schon gespeicherte source_md/metadata der
// vier Content-Tabellen liest (analog zu resolveWikiLinks in ./wikilinks.ts).
//
// Automatisch, ohne Marker:
//   - jede Mission: bis zu 2 Ereignisse (started_at / ended_at, falls gesetzt)
//   - jeder Archiv-Eintrag der Kategorie event/dialogue mit gesetztem
//     metadata.logDate
//
// Für alles andere (und zusätzlich zu den automatischen Fällen, z.B. weitere
// Meilensteine innerhalb einer Mission) gibt es einen Kommentar-Marker im
// Markdown-Body, im gleichen Stil wie <!-- private -->:
//
//   <!-- timeline: 2400-09-20 | Titel -->
//   <!-- timeline: 2400-09-20 | Titel | Kategorie -->
//
// Datum und Titel sind immer Pflicht (keine Bare-Form). Kategorie ist freier
// Text (keine Schema-Änderung nötig für neue Kategorien) und steuert nur die
// Farbe auf der Timeline-Seite. Mehrfache Marker pro Datei sind erlaubt.
//
// Marker nach <!-- private --> werden ignoriert (splitPrivate), damit
// GM-only-Ereignisse nie auf der öffentlichen Timeline landen.
//
// Jeder Marker-erzeugte Eintrag bekommt zusätzlich ein #timeline-N-Fragment
// an den href angehängt, das auf eine unsichtbare Sprungmarke im gerenderten
// HTML zeigt (siehe remarkTimelineAnchors in src/lib/markdown.ts) — ein Klick
// auf das Ereignis in der Timeline springt so direkt zur Marker-Stelle im
// Fließtext. Automatisch erzeugte Ereignisse (Mission-Start/-Ende,
// Archiv-Event/-Dialog über logDate) haben keine Marker-Stelle und bekommen
// deshalb kein Fragment.
import postgres from "postgres";
import { splitPrivate, TIMELINE_MARKER_RE } from "../../src/lib/markdown";

type SourceType = "character" | "mission" | "mission_log" | "archive_entry";

interface TimelineEventInsert {
  event_date: string;
  title: string;
  category: string;
  source_type: SourceType;
  source_slug: string;
  href: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Erkennt den häufigsten Fehler: Bindestrich statt Pipe zwischen Datum und
// Titel (z.B. "2400-09-20 - Titel" statt "2400-09-20 | Titel") — gibt dann
// einen gezielten Hinweis statt der generischen Fehlermeldung.
const DATE_HYPHEN_MISTAKE_RE = /^\d{4}-\d{2}-\d{2}\s+[-–—]\s+\S/;

// Alle <!-- timeline: ... -->-Marker im öffentlichen Teil eines Markdown-
// Bodys einsammeln. Ungültige Marker (Datum/Titel fehlt oder falsch
// formatiert) landen als Warnung in `warnings`, statt den Lauf abzubrechen.
//
// anchorIndex zählt JEDEN Marker (auch ungültige) in Dokumentreihenfolge hoch
// und muss 1:1 mit remarkTimelineAnchors() in src/lib/markdown.ts
// übereinstimmen, das dieselbe RegExp in derselben Reihenfolge über
// denselben splitPrivate()-Text auswertet, um die Sprungmarke <span
// id="timeline-N"> im gerenderten HTML zu erzeugen.
function parseTimelineMarkers(
  sourceMd: string | null,
): {
  events: { date: string; title: string; category: string | null; anchorIndex: number }[];
  warnings: string[];
} {
  const events: { date: string; title: string; category: string | null; anchorIndex: number }[] = [];
  const warnings: string[] = [];
  if (!sourceMd) return { events, warnings };

  const publicMd = splitPrivate(sourceMd);
  TIMELINE_MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let anchorIndex = 0;
  while ((match = TIMELINE_MARKER_RE.exec(publicMd))) {
    anchorIndex += 1;
    const [date, title, category] = match[1].split("|").map((p) => p.trim());
    if (!date || !DATE_RE.test(date) || !title) {
      const hint = DATE_HYPHEN_MISTAKE_RE.test(date ?? "")
        ? " (sieht nach Bindestrich statt Pipe zwischen Datum und Titel aus – erwartet wird 'JJJJ-MM-TT | Titel')"
        : "";
      warnings.push(
        `Ungueltiger Marker "<!--timeline:${match[1].trim()}-->" - Datum (JJJJ-MM-TT) und Titel sind Pflicht${hint}`,
      );
      continue;
    }
    events.push({ date, title, category: category || null, anchorIndex });
  }
  return { events, warnings };
}

export async function ingestTimeline(sql: postgres.Sql): Promise<void> {
  console.log("\n🕰  Timeline: baue Ereignisse neu auf");

  const rows: TimelineEventInsert[] = [];
  const errors: string[] = [];

  // ── Missionen: automatisch über started_at/ended_at + Marker im Body ──
  const missions = await sql<
    { slug: string; title: string; started_at: string | null; ended_at: string | null; source_md: string | null }[]
  >`SELECT slug, title, started_at::text AS started_at, ended_at::text AS ended_at, source_md FROM missions`;

  for (const m of missions) {
    const href = `/missions/${m.slug}`;
    if (m.started_at) {
      rows.push({
        event_date: m.started_at,
        title: `Mission gestartet: ${m.title}`,
        category: "mission_start",
        source_type: "mission",
        source_slug: m.slug,
        href,
      });
    }
    if (m.ended_at) {
      rows.push({
        event_date: m.ended_at,
        title: `Mission abgeschlossen: ${m.title}`,
        category: "mission_end",
        source_type: "mission",
        source_slug: m.slug,
        href,
      });
    }
    const { events, warnings } = parseTimelineMarkers(m.source_md);
    for (const e of events) {
      rows.push({
        event_date: e.date,
        title: e.title,
        category: e.category ?? "sonstiges",
        source_type: "mission",
        source_slug: m.slug,
        href: `${href}#timeline-${e.anchorIndex}`,
      });
    }
    warnings.forEach((w) => errors.push(`  ✗ Mission "${m.slug}": ${w}`));
  }

  // ── Charaktere: nur Marker (einziger Weg auf die Timeline) ──
  const characters = await sql<
    { slug: string; source_md: string | null }[]
  >`SELECT slug, source_md FROM characters`;

  for (const c of characters) {
    const { events, warnings } = parseTimelineMarkers(c.source_md);
    for (const e of events) {
      rows.push({
        event_date: e.date,
        title: e.title,
        category: e.category ?? "sonstiges",
        source_type: "character",
        source_slug: c.slug,
        href: `/characters/${c.slug}#timeline-${e.anchorIndex}`,
      });
    }
    warnings.forEach((w) => errors.push(`  ✗ Charakter "${c.slug}": ${w}`));
  }

  // ── Mission-Logs: nur Marker ──
  const logs = await sql<
    { slug: string; source_md: string | null; mission_slug: string }[]
  >`
    SELECT ml.slug, ml.source_md, m.slug AS mission_slug
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
  `;

  for (const log of logs) {
    const { events, warnings } = parseTimelineMarkers(log.source_md);
    for (const e of events) {
      rows.push({
        event_date: e.date,
        title: e.title,
        category: e.category ?? "sonstiges",
        source_type: "mission_log",
        source_slug: log.slug,
        href: `/missions/${log.mission_slug}/${log.slug}#timeline-${e.anchorIndex}`,
      });
    }
    warnings.forEach((w) => errors.push(`  ✗ Mission-Log "${log.slug}": ${w}`));
  }

  // ── Archiv-Einträge: automatisch für event/dialogue + Marker überall ──
  const archiveEntries = await sql<
    { slug: string; title: string; category: string; metadata: unknown; source_md: string | null }[]
  >`SELECT slug, title, category, metadata, source_md FROM archive_entries`;

  for (const entry of archiveEntries) {
    const href = `/archive/${entry.slug}`;
    const metadata = (
      typeof entry.metadata === "string" ? JSON.parse(entry.metadata) : entry.metadata
    ) as { logDate?: string | null } | null;
    const logDate = metadata?.logDate ?? null;

    if ((entry.category === "event" || entry.category === "dialogue") && logDate) {
      rows.push({
        event_date: logDate,
        title: entry.title,
        category: entry.category,
        source_type: "archive_entry",
        source_slug: entry.slug,
        href,
      });
    }

    const { events, warnings } = parseTimelineMarkers(entry.source_md);
    for (const e of events) {
      rows.push({
        event_date: e.date,
        title: e.title,
        category: e.category ?? "sonstiges",
        source_type: "archive_entry",
        source_slug: entry.slug,
        href: `${href}#timeline-${e.anchorIndex}`,
      });
    }
    warnings.forEach((w) => errors.push(`  ✗ Archiv-Eintrag "${entry.slug}": ${w}`));
  }

  // ── Komplett neu aufbauen (kleine Datenmenge, vermeidet Karteileichen) ──
  // created_at soll dabei aber NICHT auf NOW() zurückspringen, sonst sähe
  // nach jedem Ingest-Lauf das komplette Archiv wie "gerade neu
  // hinzugefügt" aus (siehe getRecentActivitySince in src/lib/timeline.ts,
  // das genau danach filtert) — bereits bekannte Ereignisse übernehmen
  // deshalb ihr bisheriges created_at, nur echte Neuzugänge bekommen NOW().
  const existing = await sql<
    { source_type: SourceType; source_slug: string; href: string; title: string; created_at: string }[]
  >`SELECT source_type, source_slug, href, title, created_at FROM timeline_events`;
  const previousCreatedAt = new Map<string, string>();
  for (const e of existing) {
    previousCreatedAt.set(
      `${e.source_type} ${e.source_slug} ${e.href} ${e.title}`,
      e.created_at,
    );
  }

  await sql`DELETE FROM timeline_events`;
  for (const row of rows) {
    const key = `${row.source_type} ${row.source_slug} ${row.href} ${row.title}`;
    const createdAt = previousCreatedAt.get(key) ?? null;
    await sql`
      INSERT INTO timeline_events (
        event_date, title, category, source_type, source_slug, href, created_at
      ) VALUES (
        ${row.event_date}, ${row.title}, ${row.category},
        ${row.source_type}, ${row.source_slug}, ${row.href},
        COALESCE(${createdAt}, NOW())
      )
    `;
  }

  console.log(`  → ${rows.length} Ereignisse`);
  if (errors.length > 0) {
    console.error("\n  Hinweise:");
    errors.forEach((e) => console.error(e));
  }
}
