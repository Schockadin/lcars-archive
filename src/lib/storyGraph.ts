import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { archiveTitle } from "@/lib/archiveFormat";
import {
  buildStoryEdges,
  computeYearRange,
  yearFromIso,
  type EdgeLookupEntry,
} from "@/lib/storyGraphFormat";
import type {
  StoryGraph,
  StoryNode,
  StoryEdge,
} from "@/types/storyGraph";

// Baut den Story-Graph der Timeline (/timeline): Knoten sind öffentliche,
// nicht-Entwurf-Charaktere/Missionen/Archiv-Einträge (offene Gespräche
// ausgenommen), Kanten die internen Verlinkungen (Wikilinks im source_md +
// archive_links). Jedem Knoten ist sein frühestes Jahr zugeordnet — KOMBINIERT
// aus Timeline-Ereignissen, Missions-Daten (started/ended), Gespräch-logDate
// und Charakter-Geburtsjahr — als Schwelle für den kumulativen Jahres-Regler.
// Gecacht und an die Inhalts-/Timeline-Tags gebunden.
export const getStoryGraph = unstable_cache(
  async (): Promise<StoryGraph> => {
    const [characters, missions, archiveEntries, timelineYears, archiveLinks] =
      await Promise.all([
        sql<
          {
            slug: string;
            name: string;
            source_md: string | null;
            dob: string | null;
            aliases: string[] | null;
          }[]
        >`
          SELECT slug, name, source_md,
                 metadata->>'dateOfBirth' AS dob,
                 metadata->'aliases' AS aliases
          FROM characters
          WHERE visibility = 'public' AND deleted_at IS NULL AND is_draft = false
        `,
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
                 started_at::text AS started_at, ended_at::text AS ended_at
          FROM missions
          WHERE deleted_at IS NULL AND is_draft = false
        `,
        sql<
          {
            slug: string;
            title: string;
            category: string;
            setting: string | null;
            source_md: string | null;
            log_date: string | null;
          }[]
        >`
          SELECT slug, title, category,
                 metadata->>'setting' AS setting,
                 source_md,
                 metadata->>'logDate' AS log_date
          FROM archive_entries
          WHERE visibility = 'public' AND deleted_at IS NULL AND is_draft = false
            AND NOT (category = 'dialogue' AND dialogue_open)
        `,
        sql<{ source_type: string; source_slug: string; year: number | null }[]>`
          SELECT source_type, source_slug,
                 EXTRACT(YEAR FROM event_date)::int AS year
          FROM timeline_events
          WHERE event_date IS NOT NULL
        `,
        sql<{ source_slug: string; target_slug: string; label: string | null }[]>`
          SELECT s.slug AS source_slug, t.slug AS target_slug, al.label
          FROM archive_links al
          JOIN archive_entries s ON s.id = al.source_id
          JOIN archive_entries t ON t.id = al.target_id
          WHERE s.deleted_at IS NULL AND t.deleted_at IS NULL
            AND s.visibility = 'public' AND t.visibility = 'public'
        `,
      ]);

    // Timeline-Jahre je Quelle (source_type:source_slug) → Jahres-Liste.
    const timelineByKey = new Map<string, number[]>();
    for (const row of timelineYears) {
      if (row.year == null) continue;
      const key = `${row.source_type}:${row.source_slug}`;
      const list = timelineByKey.get(key);
      if (list) list.push(row.year);
      else timelineByKey.set(key, [row.year]);
    }

    const nodes: StoryNode[] = [];
    const lookup: EdgeLookupEntry[] = [];
    const sourceMdById = new Map<string, string | null>();
    const allYears: number[] = [];

    const addNode = (
      node: StoryNode,
      titles: string[],
      sourceMd: string | null,
      years: (number | null)[],
    ) => {
      const clean = years.filter((y): y is number => y != null);
      const minYear = clean.length > 0 ? Math.min(...clean) : null;
      nodes.push({ ...node, minYear });
      lookup.push({ id: node.id, slug: node.slug, titles });
      sourceMdById.set(node.id, sourceMd);
      allYears.push(...clean);
    };

    // Reihenfolge = Auflösungs-Priorität bei Kollisionen (Charaktere > Archiv >
    // Missionen, siehe buildStoryEdges / TYPE_PRIORITY in autolink.ts).
    for (const c of characters) {
      const id = `character:${c.slug}`;
      const aliases = Array.isArray(c.aliases) ? c.aliases : [];
      addNode(
        {
          id,
          type: "character",
          slug: c.slug,
          label: c.name,
          href: `/characters/${c.slug}`,
          minYear: null,
        },
        [c.name, ...aliases],
        c.source_md,
        [yearFromIso(c.dob), ...(timelineByKey.get(`character:${c.slug}`) ?? [])],
      );
    }
    for (const a of archiveEntries) {
      const id = `archive:${a.slug}`;
      const label = archiveTitle({
        category: a.category as never,
        title: a.title,
        metadata: { setting: a.setting },
      });
      addNode(
        {
          id,
          type: "archive",
          slug: a.slug,
          label,
          href: `/archive/${a.slug}`,
          minYear: null,
        },
        [a.title, ...(a.setting ? [a.setting] : [])],
        a.source_md,
        [
          yearFromIso(a.log_date),
          ...(timelineByKey.get(`archive_entry:${a.slug}`) ?? []),
        ],
      );
    }
    for (const m of missions) {
      const id = `mission:${m.slug}`;
      addNode(
        {
          id,
          type: "mission",
          slug: m.slug,
          label: m.title,
          href: `/missions/${m.slug}`,
          minYear: null,
        },
        [m.title],
        m.source_md,
        [
          yearFromIso(m.started_at),
          yearFromIso(m.ended_at),
          ...(timelineByKey.get(`mission:${m.slug}`) ?? []),
        ],
      );
    }

    const extraEdges: StoryEdge[] = archiveLinks.map((l) => ({
      source: `archive:${l.source_slug}`,
      target: `archive:${l.target_slug}`,
      label: l.label ?? undefined,
    }));

    const edges = buildStoryEdges(lookup, sourceMdById, extraEdges);
    const yearRange = computeYearRange(allYears);

    return { nodes, edges, yearRange };
  },
  ["getStoryGraph", "v1"],
  {
    tags: [
      cacheTags.timeline,
      cacheTags.characters,
      cacheTags.missions,
      cacheTags.archive,
    ],
  },
);
