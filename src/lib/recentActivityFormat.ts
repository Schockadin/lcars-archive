// React-/DB-freie Kern-Logik für den persistenten Dashboard-News-Feed —
// importierbar aus Tests (anders als recentActivity.ts, das "server-only" ist,
// weil es die DB anspricht). Gleiches Muster wie campaignFormat.ts vs.
// campaign.ts. Die eigentliche DB-Abfrage lebt in recentActivity.ts und ruft
// computeNewsItems() mit den geladenen Zeilen auf.
import type { TimelineSourceType } from "@/types/timeline";

// News-Kind: neu erstellt / bearbeitet / gelöscht. Entspricht den drei
// einstellbaren News-Arten im Profil (users.news_kinds).
export type NewsKind = "created" | "updated" | "deleted";

export interface NewsFeedItem {
  // Stabiler Client-Key (kind + Ziel).
  key: string;
  kind: NewsKind;
  // Ziel für das Ausblenden/„gesehen"-Tracking (news_seen): bei Inhalten der
  // Inhaltstyp + Slug, bei Löschungen 'deletion' + content_deletions.id.
  targetType: TimelineSourceType | "deletion";
  targetKey: string;
  title: string;
  // null bei gelöschten Inhalten (Ziel existiert nicht mehr).
  href: string | null;
  timestamp: string;
  authorName: string | null;
}

// Rohzeile aus den Inhaltstabellen (characters/missions/mission_logs/
// archive_entries), vereinheitlicht per UNION in recentActivity.ts.
export interface NewsContentRow {
  target_type: TimelineSourceType;
  slug: string;
  title: string;
  mission_slug: string | null;
  dialogue_open: boolean | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

// Rohzeile aus dem Löschprotokoll (content_deletions).
export interface NewsDeletionRow {
  id: number;
  target_type: TimelineSourceType;
  title: string;
  deleted_at: string;
  deleted_by_name: string | null;
}

// „gesehen bis"-Grenze pro Ziel (aus news_seen).
export interface NewsSeenEntry {
  targetType: string;
  targetKey: string;
  seenAt: string;
}

export function toHref(row: NewsContentRow): string {
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

export interface ComputeNewsInput {
  contentRows: NewsContentRow[];
  deletionRows: NewsDeletionRow[];
  seenEntries: NewsSeenEntry[];
  newsKinds: string[];
  // Untergrenze des Zeitfensters (created_at/updated_at müssen jünger sein).
  since: Date;
}

// Baut aus den geladenen Rohzeilen die anzuzeigenden News:
//   - filtert nach den gewählten News-Arten (newsKinds),
//   - erzeugt pro Inhalt ggf. eine „created"- UND eine „updated"-News (mit
//     unterschiedlichem Zeitstempel, gleichem Ziel),
//   - blendet News aus, deren Zeitstempel <= der „gesehen"-Grenze ihres Ziels
//     liegt (news_seen),
//   - sortiert absteigend nach Zeitstempel (neueste zuerst).
// Bewusst OHNE Limit — die scrollbare Sektion begrenzt nur die Höhe, damit
// „Alles als gelesen markieren" wirklich alle News erfasst.
export function computeNewsItems(input: ComputeNewsInput): NewsFeedItem[] {
  const wantCreated = input.newsKinds.includes("created");
  const wantUpdated = input.newsKinds.includes("updated");
  const wantDeleted = input.newsKinds.includes("deleted");
  if (!wantCreated && !wantUpdated && !wantDeleted) return [];

  const seenMap = new Map<string, Date>();
  for (const s of input.seenEntries) {
    seenMap.set(`${s.targetType}:${s.targetKey}`, new Date(s.seenAt));
  }
  const isSeen = (
    targetType: string,
    targetKey: string,
    timestamp: string,
  ): boolean => {
    const seenAt = seenMap.get(`${targetType}:${targetKey}`);
    return seenAt != null && new Date(timestamp) <= seenAt;
  };

  const items: NewsFeedItem[] = [];

  if (wantCreated || wantUpdated) {
    for (const row of input.contentRows) {
      const href = toHref(row);
      const createdInWindow = new Date(row.created_at) > input.since;
      const wasEdited =
        new Date(row.updated_at) > new Date(row.created_at);

      if (
        wantCreated &&
        createdInWindow &&
        !isSeen(row.target_type, row.slug, row.created_at)
      ) {
        items.push({
          key: `created-${row.target_type}-${row.slug}`,
          kind: "created",
          targetType: row.target_type,
          targetKey: row.slug,
          title: row.title,
          href,
          timestamp: row.created_at,
          authorName: row.author_name,
        });
      }

      if (
        wantUpdated &&
        wasEdited &&
        new Date(row.updated_at) > input.since &&
        !isSeen(row.target_type, row.slug, row.updated_at)
      ) {
        items.push({
          key: `updated-${row.target_type}-${row.slug}`,
          kind: "updated",
          targetType: row.target_type,
          targetKey: row.slug,
          title: row.title,
          href,
          timestamp: row.updated_at,
          authorName: row.author_name,
        });
      }
    }
  }

  if (wantDeleted) {
    for (const row of input.deletionRows) {
      const key = String(row.id);
      if (isSeen("deletion", key, row.deleted_at)) continue;
      items.push({
        key: `deleted-${row.id}`,
        kind: "deleted",
        targetType: "deletion",
        targetKey: key,
        title: row.title,
        href: null,
        timestamp: row.deleted_at,
        authorName: row.deleted_by_name,
      });
    }
  }

  items.sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0,
  );
  return items;
}
