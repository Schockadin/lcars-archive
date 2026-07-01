import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import type { ArchiveCategory } from "@/types/archive";
import type { SearchResult } from "@/types/search";

// Jederzeit frisch — die Suche hängt am Query-Parameter.
export const dynamic = "force-dynamic";

const PER_TYPE_LIMIT = 6;

// Globale Suche über alle Eintragstypen (Charaktere, Missionen, Mission-Logs,
// Archiv-Einträge) per ILIKE — keine DB-Änderungen nötig. Bei Logs und
// Archiv-Einträgen wird auch der Volltext (content) durchsucht, nicht nur der
// Titel, sonst fehlen Treffer, die nur im Log-/Gesprächstext vorkommen.
// Präfix-Treffer auf den Titel werden vor reinen Volltext-Treffern einsortiert.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q}%`;
  const prefix = `${q}%`;

  try {
    const [chars, missions, logs, archive] = await Promise.all([
      sql<{ name: string; slug: string }[]>`
        SELECT name, slug
        FROM characters
        WHERE name ILIKE ${like}
        ORDER BY (name ILIKE ${prefix}) DESC, name ASC
        LIMIT ${PER_TYPE_LIMIT}
      `,
      sql<{ title: string; slug: string }[]>`
        SELECT title, slug
        FROM missions
        WHERE title ILIKE ${like}
        ORDER BY (title ILIKE ${prefix}) DESC, title ASC
        LIMIT ${PER_TYPE_LIMIT}
      `,
      sql<
        {
          title: string;
          slug: string;
          mission_slug: string;
          mission_title: string;
        }[]
      >`
        SELECT ml.title, ml.slug, m.slug AS mission_slug, m.title AS mission_title
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        WHERE ml.title ILIKE ${like} OR ml.content ILIKE ${like}
        ORDER BY (ml.title ILIKE ${prefix}) DESC, ml.title ASC
        LIMIT ${PER_TYPE_LIMIT}
      `,
      sql<
        {
          title: string;
          slug: string;
          category: ArchiveCategory;
          setting: string | null;
        }[]
      >`
        SELECT title, slug, category, metadata->>'setting' AS setting
        FROM archive_entries
        WHERE title ILIKE ${like}
           OR content ILIKE ${like}
           OR (category = 'dialogue' AND metadata->>'setting' ILIKE ${like})
        ORDER BY (title ILIKE ${prefix}) DESC, title ASC
        LIMIT ${PER_TYPE_LIMIT}
      `,
    ]);

    const results: SearchResult[] = [
      ...chars.map((c) => ({
        type: "character" as const,
        label: c.name,
        sublabel: "Charakter",
        href: `/characters/${c.slug}`,
      })),
      ...missions.map((m) => ({
        type: "mission" as const,
        label: m.title,
        sublabel: "Mission",
        href: `/missions/${m.slug}`,
      })),
      ...logs.map((l) => ({
        type: "log" as const,
        label: l.title,
        sublabel: `Log · ${l.mission_title}`,
        href: `/missions/${l.mission_slug}/${l.slug}`,
      })),
      ...archive.map((a) => ({
        type: "archive" as const,
        label:
          a.category === "dialogue"
            ? a.setting
              ? `Gespräch auf ${a.setting}`
              : "Gespräch"
            : a.title,
        sublabel: CATEGORY_CONFIG[a.category]?.label ?? "Archiv",
        href: `/archive/${a.slug}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Suche fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Suche fehlgeschlagen" },
      { status: 500 },
    );
  }
}
