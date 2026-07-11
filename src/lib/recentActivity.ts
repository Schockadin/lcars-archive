import "server-only";
import sql from "@/lib/db";
import type { TimelineSourceType } from "@/types/timeline";

export interface RecentActivityItem {
  targetType: TimelineSourceType;
  slug: string;
  title: string;
  href: string;
  timestamp: string;
  // null bei Vault-Ingest-Inhalten ohne owner_user_id — die NewsRow zeigt in
  // dem Fall "Spielleitung" (siehe NewsSection.tsx).
  authorName: string | null;
}

interface RecentActivityRow {
  target_type: TimelineSourceType;
  slug: string;
  title: string;
  mission_slug: string | null;
  dialogue_open: boolean | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

function toHref(row: RecentActivityRow): string {
  switch (row.target_type) {
    case "character":
      return `/characters/${row.slug}`;
    case "mission":
      return `/missions/${row.slug}`;
    case "mission_log":
      return `/missions/${row.mission_slug}/${row.slug}`;
    case "archive_entry":
      // Offene Dialoge leben unter /dialogues, nicht /archive (siehe
      // toFollowedContent in src/lib/follows.ts für dasselbe Muster).
      return row.dialogue_open
        ? `/dialogues/${row.slug}`
        : `/archive/${row.slug}`;
  }
}

// "Neu"/"Aktualisiert" seit dem letzten Dashboard-Besuch (last_dashboard_visit_at,
// siehe touchDashboardVisit in src/lib/users.ts) — bewusst direkt aus den Inhaltstabellen
// (created_at/updated_at) statt aus timeline_events: Timeline-Einträge sind
// kuratierte In-Story-Ereignisse (eigene Kategorie/Datum), keine "was ist neu
// im Archiv"-Quelle (siehe commit 53e76fa, das die vorherige, komplett auf
// timeline_events basierende Implementierung entfernt hat).
//
// Sichtbarkeits-Filter wie getBookmarkedContent/getSubscribedContent in
// src/lib/follows.ts: öffentlich ODER eigener Inhalt (kein gm-Bonus, keine
// Admin-Sonderrolle — bewusst dieselbe einfache Regel wie dort). Missionen
// haben keine visibility-Spalte (immer öffentlich, siehe scripts/schema.sql).
//
// Ein Eintrag erscheint nie in beiden Listen: "neu" hat Vorrang, ein frisch
// angelegter UND seither editierter Eintrag zählt nur als "neu". Kein
// unstable_cache: pro User unterschiedlich, und die Dashboard-Route ist
// durch den Session-Zugriff ohnehin dynamisch.
//
// Offene Gespräche (category='dialogue' AND dialogue_open) werden hier
// bewusst ausgeschlossen — die leben in einer eigenen Liste
// (getDialoguesForUser) und haben ihre eigene, stets offene Akkordeon-
// Sektion (OpenDialoguesSection.tsx), nicht die News-Sektion
// (NewsSection.tsx). Ein abgeschlossenes Gespräch ist danach ein ganz
// normaler archive_entry und taucht wieder normal auf.
export async function getRecentActivity(
  userId: number,
  since: Date | null,
  limit = 20,
): Promise<{ created: RecentActivityItem[]; updated: RecentActivityItem[] }> {
  if (!since) return { created: [], updated: [] };

  const rows = await sql<RecentActivityRow[]>`
    SELECT 'character'::text AS target_type, c.slug, c.name AS title,
           NULL::text AS mission_slug, NULL::boolean AS dialogue_open,
           pu.name AS author_name,
           c.created_at::text AS created_at, c.updated_at::text AS updated_at
    FROM characters c
    LEFT JOIN users pu ON pu.id = c.player_id
    WHERE (c.visibility = 'public' OR c.player_id = ${userId})
      AND (c.created_at > ${since} OR c.updated_at > ${since})

    UNION ALL

    SELECT 'mission'::text, m.slug, m.title,
           NULL::text, NULL::boolean,
           ou.name,
           m.created_at::text, m.updated_at::text
    FROM missions m
    LEFT JOIN users ou ON ou.id = m.owner_user_id
    WHERE m.created_at > ${since} OR m.updated_at > ${since}

    UNION ALL

    SELECT 'mission_log'::text, ml.slug, ml.title,
           m.slug, NULL::boolean,
           ou.name,
           ml.created_at::text, ml.updated_at::text
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    LEFT JOIN users ou ON ou.id = ml.owner_user_id
    WHERE (ml.visibility = 'public' OR ml.owner_user_id = ${userId})
      AND (ml.created_at > ${since} OR ml.updated_at > ${since})

    UNION ALL

    SELECT 'archive_entry'::text, a.slug, a.title,
           NULL::text, a.dialogue_open,
           au.name,
           a.created_at::text, a.updated_at::text
    FROM archive_entries a
    LEFT JOIN users au ON au.id = a.owner_user_id
    WHERE (a.visibility = 'public' OR a.owner_user_id = ${userId})
      AND (a.created_at > ${since} OR a.updated_at > ${since})
      AND (a.category != 'dialogue' OR a.dialogue_open = FALSE)
  `;

  const created: RecentActivityItem[] = [];
  const updated: RecentActivityItem[] = [];

  for (const row of rows) {
    const item: RecentActivityItem = {
      targetType: row.target_type,
      slug: row.slug,
      title: row.title,
      href: toHref(row),
      authorName: row.author_name,
      timestamp:
        new Date(row.created_at) > since ? row.created_at : row.updated_at,
    };
    if (new Date(row.created_at) > since) {
      created.push(item);
    } else {
      updated.push(item);
    }
  }

  created.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  updated.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return { created: created.slice(0, limit), updated: updated.slice(0, limit) };
}

export interface DeletionItem {
  targetType: TimelineSourceType;
  title: string;
  timestamp: string;
  // null, wenn der löschende Account seither selbst gelöscht wurde
  // (deleted_by ON DELETE SET NULL, siehe scripts/schema.sql) — die
  // NewsRow zeigt in dem Fall "Spielleitung" (analog authorName oben).
  deletedByName: string | null;
}

// Gelöschte Inhalte seit dem letzten Besuch, aus dem Löschprotokoll
// (content_deletions, siehe scripts/schema.sql) — Missionen/Mission-Logs/
// Gespräche werden hart gelöscht, ohne dieses Protokoll gäbe es danach
// keine Zeile mehr, aus der ein "gelöscht"-Eintrag im News-Feed
// (NewsSection.tsx) entstehen könnte. Kein href: das Ziel existiert nicht
// mehr. Gleiche Sichtbarkeitsregel wie getRecentActivity — visibility IS
// NULL steht für Missionen (keine eigene visibility-Spalte, immer
// öffentlich).
export async function getRecentDeletions(
  userId: number,
  since: Date | null,
  limit = 20,
): Promise<DeletionItem[]> {
  if (!since) return [];

  const rows = await sql<
    {
      target_type: TimelineSourceType;
      title: string;
      deleted_at: string;
      deleted_by_name: string | null;
    }[]
  >`
    SELECT cd.target_type, cd.title, cd.deleted_at::text AS deleted_at,
           du.name AS deleted_by_name
    FROM content_deletions cd
    LEFT JOIN users du ON du.id = cd.deleted_by
    WHERE cd.deleted_at > ${since}
      AND (cd.visibility IS NULL OR cd.visibility = 'public' OR cd.owner_user_id = ${userId})
    ORDER BY cd.deleted_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    targetType: row.target_type,
    title: row.title,
    timestamp: row.deleted_at,
    deletedByName: row.deleted_by_name,
  }));
}
