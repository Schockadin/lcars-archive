import "server-only";
import sql from "@/lib/db";
import { sendUserContentEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";

// ToDo: Granularer machen: "mission" | "dialogue" | "npc", etc.
// mission_log ist bewusst NICHT Teil dieser Liste: Mission-Logs sind reine
// Session-Protokolle innerhalb einer Mission, die Mission selbst trägt schon
// das Follow — ein zusätzliches Follow pro einzelnem Log wäre Rauschen ohne
// echten Zusatznutzen (siehe ActionsMenu.tsx, das für contentType
// "missionLog" deshalb gar kein followType übergibt).
// "user" (target_slug = users.slug) ist kein einzelner Inhalt, sondern ein
// Sammel-Abo: benachrichtigt bei jedem neuen/geänderten öffentlichen Inhalt
// des abonnierten Users (siehe notifyUserSubscribers unten) — subscribeOnly
// in FollowButtons, ein Bookmark auf einen User ergibt keinen Sinn.
export type FollowTargetType =
  | "mission"
  | "archive_entry"
  | "character"
  | "user";

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
  dialogue_open?: boolean | null;
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
          : row.target_type === "user"
            ? `/users/${row.slug}`
            : // Offene Dialoge leben unter /dialogues, nicht /archive (siehe
              // src/app/user/content/page.tsx für dasselbe Muster).
              row.dialogue_open
              ? `/dialogues/${row.slug}`
              : `/archive/${row.slug}`,
  };
}

export async function getBookmarkedContent(
  userId: number,
): Promise<FollowedContent[]> {
  const rows = await sql<
    {
      target_type: FollowTargetType;
      slug: string;
      title: string;
      dialogue_open: boolean | null;
    }[]
  >`
    SELECT 'mission'::text AS target_type, m.slug, m.title, NULL::boolean AS dialogue_open
    FROM content_follows cf
    JOIN missions m ON m.slug = cf.target_slug AND cf.target_type = 'mission'
    WHERE cf.user_id = ${userId} AND cf.bookmarked_at IS NOT NULL
    UNION ALL
    SELECT 'archive_entry'::text AS target_type, a.slug, a.title, a.dialogue_open
    FROM content_follows cf
    JOIN archive_entries a ON a.slug = cf.target_slug AND cf.target_type = 'archive_entry'
    WHERE cf.user_id = ${userId} AND cf.bookmarked_at IS NOT NULL
      AND (a.visibility = 'public' OR a.owner_user_id = ${userId})
    UNION ALL
    SELECT 'character'::text AS target_type, c.slug, c.name AS title, NULL::boolean AS dialogue_open
    FROM content_follows cf
    JOIN characters c ON c.slug = cf.target_slug AND cf.target_type = 'character'
    WHERE cf.user_id = ${userId} AND cf.bookmarked_at IS NOT NULL
      AND (c.visibility = 'public' OR c.player_id = ${userId})
    UNION ALL
    SELECT 'user'::text AS target_type, u.slug, u.name AS title, NULL::boolean AS dialogue_open
    FROM content_follows cf
    JOIN users u ON u.slug = cf.target_slug AND cf.target_type = 'user'
    WHERE cf.user_id = ${userId} AND cf.bookmarked_at IS NOT NULL
    ORDER BY title ASC
  `;
  return rows.map(toFollowedContent);
}

export async function getSubscribedContent(
  userId: number,
): Promise<FollowedContent[]> {
  const rows = await sql<
    {
      target_type: FollowTargetType;
      slug: string;
      title: string;
      dialogue_open: boolean | null;
    }[]
  >`
    SELECT 'mission'::text AS target_type, m.slug, m.title, NULL::boolean AS dialogue_open
    FROM content_follows cf
    JOIN missions m ON m.slug = cf.target_slug AND cf.target_type = 'mission'
    WHERE cf.user_id = ${userId} AND cf.subscribed_at IS NOT NULL
    UNION ALL
    SELECT 'archive_entry'::text AS target_type, a.slug, a.title, a.dialogue_open
    FROM content_follows cf
    JOIN archive_entries a ON a.slug = cf.target_slug AND cf.target_type = 'archive_entry'
    WHERE cf.user_id = ${userId} AND cf.subscribed_at IS NOT NULL
      AND (a.visibility = 'public' OR a.owner_user_id = ${userId})
    UNION ALL
    SELECT 'character'::text AS target_type, c.slug, c.name AS title, NULL::boolean AS dialogue_open
    FROM content_follows cf
    JOIN characters c ON c.slug = cf.target_slug AND cf.target_type = 'character'
    WHERE cf.user_id = ${userId} AND cf.subscribed_at IS NOT NULL
      AND (c.visibility = 'public' OR c.player_id = ${userId})
    UNION ALL
    SELECT 'user'::text AS target_type, u.slug, u.name AS title, NULL::boolean AS dialogue_open
    FROM content_follows cf
    JOIN users u ON u.slug = cf.target_slug AND cf.target_type = 'user'
    WHERE cf.user_id = ${userId} AND cf.subscribed_at IS NOT NULL
    ORDER BY title ASC
  `;
  return rows.map(toFollowedContent);
}

export interface FollowSubscriber {
  id: number;
  email: string;
  name: string;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

// Abonnenten eines Users (target_type 'user', siehe FollowTargetType oben)
// — eigenständig exportiert (nicht nur intern in notifyUserSubscribers),
// damit z.B. missions/_shared/contentAction.ts dieselbe Liste für eine
// andere Benachrichtigung (Mission-Teilnahme eines abonnierten Users) nutzen
// kann, ohne die Query zu duplizieren.
export async function getUserSubscribers(
  userSlug: string,
): Promise<FollowSubscriber[]> {
  const rows = await sql<
    {
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    WHERE cf.target_type = 'user' AND cf.target_slug = ${userSlug}
      AND cf.subscribed_at IS NOT NULL
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    emailNotificationsEnabled: row.email_notifications_enabled,
    pushNotificationsEnabled: row.push_notifications_enabled,
  }));
}

// An alle Abonnenten eines Users, sobald dieser User einen neuen öffentlichen
// Inhalt erstellt oder einen bestehenden auf public umstellt — aufgerufen aus
// setVisibilityAction (user/content/actions.ts, der zentralen
// Sichtbarkeits-Action für alle vier Inhaltstypen) sowie den jeweiligen
// Anlage-Actions. Author-Name/-Slug wird hier selbst nachgeschlagen, damit
// Aufrufer nicht extra dafür laden müssen. Schließt den Autor selbst aus
// (falls er sich versehentlich selbst abonniert hat).
export async function notifyUserSubscribers(input: {
  authorUserId: number;
  contentTypeLabel: string;
  contentTitle: string;
  contentUrl: string;
  preview: string;
}): Promise<void> {
  const [author] = await sql<{ slug: string; name: string }[]>`
    SELECT slug, name FROM users WHERE id = ${input.authorUserId}
  `;
  if (!author) return;

  const subscribers = (await getUserSubscribers(author.slug)).filter(
    (s) => s.id !== input.authorUserId,
  );
  if (subscribers.length === 0) return;

  for (const subscriber of subscribers) {
    if (subscriber.emailNotificationsEnabled) {
      const result = await sendUserContentEmail({
        to: subscriber.email,
        name: subscriber.name,
        authorName: author.name,
        contentTypeLabel: input.contentTypeLabel,
        contentTitle: input.contentTitle,
        contentUrl: input.contentUrl,
        preview: input.preview,
      });
      if (!result.sent) {
        console.error(
          `User-Abo-Mail an ${subscriber.email} fehlgeschlagen: ${result.error}`,
        );
      }
    }
    if (subscriber.pushNotificationsEnabled) {
      await sendPushToUser(subscriber.id, {
        title: `${author.name}: ${input.contentTitle}`,
        body: input.preview,
        url: input.contentUrl,
      });
    }
  }
}
