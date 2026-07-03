import "server-only";
import sql from "@/lib/db";

export type FollowTargetType = "mission" | "archive_entry" | "character";

export interface FollowStatus {
  bookmarked: boolean;
  subscribed: boolean;
}

export async function getFollowStatus(
  userId: number,
  targetType: FollowTargetType,
  targetSlug: string,
): Promise<FollowStatus> {
  const rows = await sql<
    { bookmarked_at: Date | null; subscribed_at: Date | null }[]
  >`
    SELECT bookmarked_at, subscribed_at
    FROM content_follows
    WHERE user_id = ${userId} AND target_type = ${targetType} AND target_slug = ${targetSlug}
  `;
  const row = rows[0];
  return {
    bookmarked: row?.bookmarked_at != null,
    subscribed: row?.subscribed_at != null,
  };
}

async function deleteIfEmpty(
  userId: number,
  targetType: FollowTargetType,
  targetSlug: string,
): Promise<void> {
  await sql`
    DELETE FROM content_follows
    WHERE user_id = ${userId} AND target_type = ${targetType} AND target_slug = ${targetSlug}
      AND bookmarked_at IS NULL AND subscribed_at IS NULL
  `;
}

export async function setBookmark(
  userId: number,
  targetType: FollowTargetType,
  targetSlug: string,
  value: boolean,
): Promise<void> {
  if (value) {
    await sql`
      INSERT INTO content_follows (user_id, target_type, target_slug, bookmarked_at)
      VALUES (${userId}, ${targetType}, ${targetSlug}, NOW())
      ON CONFLICT (user_id, target_type, target_slug)
      DO UPDATE SET bookmarked_at = NOW()
    `;
    return;
  }

  await sql`
    UPDATE content_follows
    SET bookmarked_at = NULL
    WHERE user_id = ${userId} AND target_type = ${targetType} AND target_slug = ${targetSlug}
  `;
  await deleteIfEmpty(userId, targetType, targetSlug);
}

export async function setSubscription(
  userId: number,
  targetType: FollowTargetType,
  targetSlug: string,
  value: boolean,
): Promise<void> {
  if (value) {
    await sql`
      INSERT INTO content_follows (user_id, target_type, target_slug, subscribed_at)
      VALUES (${userId}, ${targetType}, ${targetSlug}, NOW())
      ON CONFLICT (user_id, target_type, target_slug)
      DO UPDATE SET subscribed_at = NOW()
    `;
    return;
  }

  await sql`
    UPDATE content_follows
    SET subscribed_at = NULL
    WHERE user_id = ${userId} AND target_type = ${targetType} AND target_slug = ${targetSlug}
  `;
  await deleteIfEmpty(userId, targetType, targetSlug);
}

export interface FollowedContent {
  targetType: FollowTargetType;
  slug: string;
  title: string;
  href: string;
}

function toFollowedContent(row: {
  target_type: FollowTargetType;
  slug: string;
  title: string;
}): FollowedContent {
  return {
    targetType: row.target_type,
    slug: row.slug,
    title: row.title,
    href:
      row.target_type === "mission"
        ? `/missions/${row.slug}`
        : row.target_type === "character"
          ? `/characters/${row.slug}`
          : `/archive/${row.slug}`,
  };
}

export async function getBookmarkedContent(
  userId: number,
): Promise<FollowedContent[]> {
  const rows = await sql<
    { target_type: FollowTargetType; slug: string; title: string }[]
  >`
    SELECT 'mission'::text AS target_type, m.slug, m.title
    FROM content_follows cf
    JOIN missions m ON m.slug = cf.target_slug AND cf.target_type = 'mission'
    WHERE cf.user_id = ${userId} AND cf.bookmarked_at IS NOT NULL
    UNION ALL
    SELECT 'archive_entry'::text AS target_type, a.slug, a.title
    FROM content_follows cf
    JOIN archive_entries a ON a.slug = cf.target_slug AND cf.target_type = 'archive_entry'
    WHERE cf.user_id = ${userId} AND cf.bookmarked_at IS NOT NULL
    UNION ALL
    SELECT 'character'::text AS target_type, c.slug, c.name AS title
    FROM content_follows cf
    JOIN characters c ON c.slug = cf.target_slug AND cf.target_type = 'character'
    WHERE cf.user_id = ${userId} AND cf.bookmarked_at IS NOT NULL
    ORDER BY title ASC
  `;
  return rows.map(toFollowedContent);
}

export async function getSubscribedContent(
  userId: number,
): Promise<FollowedContent[]> {
  const rows = await sql<
    { target_type: FollowTargetType; slug: string; title: string }[]
  >`
    SELECT 'mission'::text AS target_type, m.slug, m.title
    FROM content_follows cf
    JOIN missions m ON m.slug = cf.target_slug AND cf.target_type = 'mission'
    WHERE cf.user_id = ${userId} AND cf.subscribed_at IS NOT NULL
    UNION ALL
    SELECT 'archive_entry'::text AS target_type, a.slug, a.title
    FROM content_follows cf
    JOIN archive_entries a ON a.slug = cf.target_slug AND cf.target_type = 'archive_entry'
    WHERE cf.user_id = ${userId} AND cf.subscribed_at IS NOT NULL
    UNION ALL
    SELECT 'character'::text AS target_type, c.slug, c.name AS title
    FROM content_follows cf
    JOIN characters c ON c.slug = cf.target_slug AND cf.target_type = 'character'
    WHERE cf.user_id = ${userId} AND cf.subscribed_at IS NOT NULL
    ORDER BY title ASC
  `;
  return rows.map(toFollowedContent);
}
