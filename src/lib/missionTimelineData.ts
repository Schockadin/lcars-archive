import "server-only";
import sql from "@/lib/db";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { closedDialogueHref, missionHref } from "@/lib/contentRoutes";
import {
  eventId,
  parseTimelineMarkers,
  sortEvents,
  type TimelineEvent,
} from "@/lib/timelineTypes";
import type { MissionDetail } from "@/types/missions";

interface InferredMissionEventRow {
  id: number;
  event_date: string;
  title: string;
  detail: string | null;
  category: string;
}

interface DialogueRow {
  slug: string;
  title: string;
  metadata: unknown;
  source_md: string | null;
  date: string;
}

function dialogueCardMetadata(metadata: unknown): {
  people: string[];
  detail: string | null;
} {
  let value = metadata;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return { people: [], detail: null };
    }
  }
  if (!value || typeof value !== "object") return { people: [], detail: null };

  const record = value as Record<string, unknown>;
  const people = Array.isArray(record.participants)
    ? record.participants
        .map((participant) => {
          if (!participant || typeof participant !== "object") return null;
          const name = (participant as Record<string, unknown>).name;
          return typeof name === "string" ? name : null;
        })
        .filter((name): name is string => Boolean(name))
    : [];
  const detail =
    typeof record.summary === "string" && record.summary.trim()
      ? synopsisExcerpt(record.summary, 180)
      : null;

  return { people, detail };
}

function excerptOf(markdown: string | null): string | null {
  if (!markdown) return null;
  const flat = markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[*_\x60>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return flat ? synopsisExcerpt(flat, 180) : null;
}

// Ereignisse aus dem Missionstext bilden die oberste Ebene. Abgeschlossene,
// veröffentlichte Gespräche werden nur für genau dieselben Ingame-Daten geladen.
export async function getMissionTimeline(
  mission: Pick<
    MissionDetail,
    | "slug"
    | "title"
    | "started_at"
    | "ended_at"
    | "sourceMarkdown"
    | "participants"
  >,
): Promise<{ events: TimelineEvent[]; dialogues: TimelineEvent[] }> {
  const markers = parseTimelineMarkers(mission.sourceMarkdown ?? "");
  const inferred = await sql<InferredMissionEventRow[]>`
    SELECT id, event_date::text AS event_date, title, detail, category
    FROM timeline_events
    WHERE source_type = 'mission'
      AND source_slug = ${mission.slug}
      AND origin = 'inferred'
    ORDER BY event_date DESC, id DESC
  `;

  const knownDates = new Set(
    [
      mission.started_at,
      mission.ended_at,
      ...markers.map((marker) => marker.date),
    ].filter((date): date is string => Boolean(date)),
  );
  const people = mission.participants.map((participant) => participant.name);
  const href = missionHref(mission.slug);
  const events: TimelineEvent[] = markers.map((marker) => ({
    id: eventId("mission", mission.slug, "marker-" + marker.anchor),
    date: marker.date,
    title: marker.title,
    detail: null,
    category: marker.category,
    origin: "marker",
    sourceType: "mission",
    sourceTitle: mission.title,
    href: href + "#timeline-" + marker.anchor,
    people,
  }));

  for (const row of inferred) {
    // Alt-Ableitungen treten hinter gepflegte Missionsdaten und Marken zurück,
    // die bereits denselben Ingame-Tag belegen.
    if (knownDates.has(row.event_date)) continue;
    events.push({
      id: "inferred:" + row.id,
      date: row.event_date,
      title: row.title,
      detail: row.detail,
      category: row.category,
      origin: "inferred",
      sourceType: "mission",
      sourceTitle: mission.title,
      href,
      people: [],
    });
  }

  const dates = [
    ...new Set(events.flatMap((event) => (event.date ? [event.date] : []))),
  ];
  if (dates.length === 0) {
    return { events: sortEvents(events, "desc"), dialogues: [] };
  }

  const dialogueRows = await sql<DialogueRow[]>`
    SELECT slug, title, metadata, source_md,
           metadata->>'logDate' AS date
    FROM archive_entries
    WHERE category = 'dialogue'
      AND dialogue_open = false
      AND is_draft = false
      AND deleted_at IS NULL
      AND metadata->>'logDate' = ANY(${dates})
    ORDER BY metadata->>'logDate' DESC, title ASC
  `;
  const dialogues: TimelineEvent[] = dialogueRows.map((dialogue) => {
    const details = dialogueCardMetadata(dialogue.metadata);
    return {
      id: eventId("archive_entry", dialogue.slug, "date"),
      date: dialogue.date,
      title: dialogue.title,
      detail: details.detail ?? excerptOf(dialogue.source_md),
      category: "dialogue",
      origin: "metadata",
      sourceType: "archive_entry",
      sourceTitle: dialogue.title,
      href: closedDialogueHref(dialogue.slug),
      people: details.people,
    };
  });

  return { events: sortEvents(events, "desc"), dialogues };
}
