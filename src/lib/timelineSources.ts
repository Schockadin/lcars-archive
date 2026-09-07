import "server-only";
import sql from "@/lib/db";
import type { TimelineSourceType } from "@/lib/timelineTypes";

// Die Inhalte, aus denen sich Ereignisse ableiten lassen — für die Auswahl
// unter /gm/chronologie und als Vorlage für den Modellaufruf.
//
// Bewusst nur Missionen, Logbücher und Datenbank-Einträge: dort steht der
// Verlauf. Eine Personalakte beschreibt eine Figur, keinen Hergang; was sie an
// Daten führt (Geburtsdatum), steht ohnehin schon in der Chronologie.

export interface TimelineSourceItem {
  sourceType: TimelineSourceType;
  slug: string;
  title: string;
  body: string;
  // Bekannte Datumsangaben — sie gehen als Anker in den Prompt, damit das
  // Modell „drei Tage später" auflösen kann.
  anchors: Record<string, string | null>;
  // Wie viel Text da ist. Ohne Text gibt es nichts abzuleiten, und der Knopf
  // bleibt aus.
  length: number;
}

export async function listTimelineSources(): Promise<TimelineSourceItem[]> {
  const [missions, logs, entries] = await Promise.all([
    sql<
      {
        slug: string;
        title: string;
        source_md: string | null;
        started_at: string | null;
        ended_at: string | null;
      }[]
    >`
      SELECT slug, title, source_md,
             started_at::text AS started_at,
             ended_at::text   AS ended_at
      FROM missions
      WHERE deleted_at IS NULL AND is_draft = false
      ORDER BY started_at DESC NULLS LAST, created_at DESC
    `,
    sql<
      {
        slug: string;
        title: string;
        source_md: string | null;
        log_date: string | null;
        mission_started_at: string | null;
      }[]
    >`
      SELECT ml.slug, ml.title, ml.source_md,
             ml.log_date::text AS log_date,
             m.started_at::text AS mission_started_at
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id AND m.deleted_at IS NULL
      WHERE ml.deleted_at IS NULL AND ml.is_draft = false
      ORDER BY ml.log_date DESC NULLS LAST, ml.created_at DESC
    `,
    sql<
      {
        slug: string;
        title: string;
        source_md: string | null;
        metadata: Record<string, unknown>;
      }[]
    >`
      SELECT slug, title, source_md, metadata
      FROM archive_entries
      WHERE deleted_at IS NULL AND is_draft = false
      ORDER BY updated_at DESC
    `,
  ]);

  const items: TimelineSourceItem[] = [];

  for (const row of missions) {
    items.push({
      sourceType: "mission",
      slug: row.slug,
      title: row.title,
      body: row.source_md ?? "",
      anchors: {
        Missionsbeginn: row.started_at,
        Missionsende: row.ended_at,
      },
      length: (row.source_md ?? "").length,
    });
  }

  for (const row of logs) {
    items.push({
      sourceType: "mission_log",
      slug: row.slug,
      title: row.title,
      body: row.source_md ?? "",
      anchors: {
        "Datum des Logbuchs": row.log_date,
        Missionsbeginn: row.mission_started_at,
      },
      length: (row.source_md ?? "").length,
    });
  }

  for (const row of entries) {
    const logDate =
      typeof row.metadata?.logDate === "string" ? row.metadata.logDate : null;
    items.push({
      sourceType: "archive_entry",
      slug: row.slug,
      title: row.title,
      body: row.source_md ?? "",
      anchors: { "Datum des Eintrags": logDate },
      length: (row.source_md ?? "").length,
    });
  }

  return items;
}

export async function getTimelineSource(
  sourceType: TimelineSourceType,
  slug: string,
): Promise<TimelineSourceItem | null> {
  const all = await listTimelineSources();
  return (
    all.find((i) => i.sourceType === sourceType && i.slug === slug) ?? null
  );
}
