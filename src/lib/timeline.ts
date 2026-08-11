import sql from "@/lib/db";
import { splitPrivate, TIMELINE_MARKER_RE } from "@/lib/markdown";
import { TimelineSourceType } from "@/types/timeline";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface RegeneratedTimelineEvent {
  event_date: string;
  title: string;
  category: string;
  source_type: TimelineSourceType;
  source_slug: string;
  href: string;
}

// Sammelt alle <!-- timeline: JJJJ-MM-TT | Titel | Kategorie --> Marker im
// öffentlichen Teil eines Markdown-Bodys. Gleiche Logik wie
// scripts/ingest/timeline.ts (dort einmalig beim Vault-Import) — hier
// dupliziert statt geteilt, weil scripts/ nicht Teil des App-Bundles ist.
// anchorIndex muss 1:1 mit remarkTimelineAnchors() in src/lib/markdown.ts
// übereinstimmen (siehe dort).
function parseTimelineMarkers(sourceMd: string | null): {
  events: {
    date: string;
    title: string;
    category: string | null;
    anchorIndex: number;
  }[];
  warnings: string[];
} {
  const events: {
    date: string;
    title: string;
    category: string | null;
    anchorIndex: number;
  }[] = [];
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
      warnings.push(
        `Ungültiger Marker "<!--timeline:${match[1].trim()}-->" — Datum (JJJJ-MM-TT) und Titel sind Pflicht`,
      );
      continue;
    }
    events.push({ date, title, category: category || null, anchorIndex });
  }
  return { events, warnings };
}

export interface RegenerateTimelineResult {
  count: number;
  warnings: string[];
}

// Baut timeline_events komplett aus dem aktuellen DB-Stand neu auf — als
// Admin-Action nutzbar (siehe regenerateTimelineAction in
// src/app/admin/timelineActions.ts), z.B. nachdem Marker im Vault-Ingest
// hinzugekommen sind oder Ereignisse manuell inkonsistent geworden sind.
// Gleiche Regeln wie scripts/ingest/timeline.ts (automatisch: Mission
// started_at/ended_at sowie Archiv-Einträge der Kategorie event/dialogue mit
// gesetztem logDate; darüber hinaus <!-- timeline --> Marker im Markdown-Body
// jedes Inhaltstyps). created_at bereits bekannter Ereignisse (gleicher
// source_type/source_slug/href/title) bleibt erhalten, damit "neu seit dem
// letzten Besuch" nicht plötzlich den kompletten Bestand als neu markiert.
export async function regenerateTimeline(): Promise<RegenerateTimelineResult> {
  const rows: RegeneratedTimelineEvent[] = [];
  const warnings: string[] = [];

  const missions = await sql<
    {
      slug: string;
      title: string;
      started_at: string | null;
      ended_at: string | null;
      source_md: string | null;
    }[]
  >`SELECT slug, title, started_at::text AS started_at, ended_at::text AS ended_at, source_md FROM missions WHERE deleted_at IS NULL`;

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
    const { events, warnings: markerWarnings } = parseTimelineMarkers(
      m.source_md,
    );
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
    markerWarnings.forEach((w) => warnings.push(`Mission "${m.slug}": ${w}`));
  }

  const characters = await sql<{ slug: string; source_md: string | null }[]>`
    SELECT slug, source_md FROM characters WHERE deleted_at IS NULL
  `;

  for (const c of characters) {
    const { events, warnings: markerWarnings } = parseTimelineMarkers(
      c.source_md,
    );
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
    markerWarnings.forEach((w) => warnings.push(`Charakter "${c.slug}": ${w}`));
  }

  const logs = await sql<
    { slug: string; source_md: string | null; mission_slug: string }[]
  >`
    SELECT ml.slug, ml.source_md, m.slug AS mission_slug
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    WHERE ml.deleted_at IS NULL AND m.deleted_at IS NULL
  `;

  for (const log of logs) {
    const { events, warnings: markerWarnings } = parseTimelineMarkers(
      log.source_md,
    );
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
    markerWarnings.forEach((w) =>
      warnings.push(`Mission-Log "${log.slug}": ${w}`),
    );
  }

  const archiveEntries = await sql<
    {
      slug: string;
      title: string;
      category: string;
      metadata: unknown;
      source_md: string | null;
    }[]
  >`SELECT slug, title, category, metadata, source_md FROM archive_entries WHERE dialogue_open = false AND deleted_at IS NULL`;

  for (const entry of archiveEntries) {
    const href = `/archive/${entry.slug}`;
    const metadata = (
      typeof entry.metadata === "string"
        ? JSON.parse(entry.metadata)
        : entry.metadata
    ) as { logDate?: string | null } | null;
    const logDate = metadata?.logDate ?? null;

    if (
      (entry.category === "event" || entry.category === "dialogue") &&
      logDate
    ) {
      rows.push({
        event_date: logDate,
        title: entry.title,
        category: entry.category,
        source_type: "archive_entry",
        source_slug: entry.slug,
        href,
      });
    }

    const { events, warnings: markerWarnings } = parseTimelineMarkers(
      entry.source_md,
    );
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
    markerWarnings.forEach((w) =>
      warnings.push(`Archiv-Eintrag "${entry.slug}": ${w}`),
    );
  }

  const existing = await sql<
    {
      source_type: TimelineSourceType;
      source_slug: string;
      href: string;
      title: string;
      created_at: string;
    }[]
  >`SELECT source_type, source_slug, href, title, created_at FROM timeline_events`;
  const previousCreatedAt = new Map<string, string>();
  for (const e of existing) {
    previousCreatedAt.set(
      `${e.source_type} ${e.source_slug} ${e.href} ${e.title}`,
      e.created_at,
    );
  }

  await sql`DELETE FROM timeline_events`;
  for (const row of rows) {
    const key = `${row.source_type} ${row.source_slug} ${row.href} ${row.title}`;
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

  return { count: rows.length, warnings };
}
