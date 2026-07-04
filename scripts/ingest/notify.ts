import postgres from "postgres";
import { sendSubscriptionDigest } from "../../src/lib/mailCore.js";
import { sendPushToUser } from "../../src/lib/pushCore.js";

// Erste URL aus SITE_URL (kommaseparierte Liste, siehe index.ts) als
// Basis für Links in der Mail — ein lokaler Ingest-Lauf gegen eine
// Dev-DB soll nicht versehentlich auf localhost verlinken, deshalb bewusst
// die erste (Produktions-)URL statt die letzte.
function resolveBaseUrl(): string {
  const raw = process.env.SITE_URL;
  const first = raw?.split(",")[0]?.trim();
  return (first || "https://neo-archiv.de").replace(/\/$/, "");
}

interface ChangedItemRow {
  user_id: number;
  email: string;
  name: string;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  target_type: "mission" | "archive_entry" | "mission_log";
  slug: string;
  title: string;
  mission_slug: string | null;
}

// Benachrichtigt Abonnenten geänderter Missionen/Archiv-Einträge/Charaktere
// nach einem Ingest-Lauf per Sammel-Mail (eine Mail pro User über alle
// Änderungen). Wird von changedMissionSlugs (Titel/Status/Zeitraum/Body
// geändert ODER neuer Mission-Log), changedArchiveSlugs (Titel/Kategorie/
// Inhalt geändert) sowie changedCharacterSlugs+newLogSlugs (neuer
// Mission-Log eines abonnierten Charakters) gespeist — "geändert" wird von
// den jeweiligen ingest*-Funktionen selbst bestimmt (siehe missions.ts/
// missionLogs.ts/archive.ts), notify.ts kümmert sich nur noch um Versand.
export async function notifySubscribers(
  sql: postgres.Sql,
  changedMissionSlugs: Set<string>,
  changedArchiveSlugs: Set<string>,
  changedCharacterSlugs: Set<string>,
  newLogSlugs: Set<string>,
): Promise<void> {
  if (
    changedMissionSlugs.size === 0 &&
    changedArchiveSlugs.size === 0 &&
    changedCharacterSlugs.size === 0
  ) {
    return;
  }

  const rows = await sql<ChangedItemRow[]>`
    SELECT u.id AS user_id, u.email, u.name,
           u.email_notifications_enabled, u.push_notifications_enabled,
           'mission'::text AS target_type, m.slug, m.title,
           NULL::text AS mission_slug
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    JOIN missions m ON m.slug = cf.target_slug
    WHERE cf.target_type = 'mission'
      AND cf.subscribed_at IS NOT NULL
      AND cf.target_slug = ANY(${[...changedMissionSlugs]})
    UNION ALL
    SELECT u.id AS user_id, u.email, u.name,
           u.email_notifications_enabled, u.push_notifications_enabled,
           'archive_entry'::text AS target_type, a.slug, a.title,
           NULL::text AS mission_slug
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    JOIN archive_entries a ON a.slug = cf.target_slug
    WHERE cf.target_type = 'archive_entry'
      AND cf.subscribed_at IS NOT NULL
      AND cf.target_slug = ANY(${[...changedArchiveSlugs]})
    UNION ALL
    SELECT u.id AS user_id, u.email, u.name,
           u.email_notifications_enabled, u.push_notifications_enabled,
           'mission_log'::text AS target_type, ml.slug, ml.title,
           m.slug AS mission_slug
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    JOIN characters c ON c.slug = cf.target_slug AND cf.target_type = 'character'
    JOIN mission_logs ml ON ml.author_id = c.id
    JOIN missions m ON m.id = ml.mission_id
    WHERE cf.subscribed_at IS NOT NULL
      AND cf.target_slug = ANY(${[...changedCharacterSlugs]})
      AND ml.slug = ANY(${[...newLogSlugs]})
  `;

  if (rows.length === 0) {
    console.log("📭 Keine Abonnenten für die geänderten Inhalte.");
    return;
  }

  const baseUrl = resolveBaseUrl();
  const byUser = new Map<
    number,
    {
      email: string;
      name: string;
      emailEnabled: boolean;
      pushEnabled: boolean;
      items: { title: string; href: string }[];
    }
  >();

  for (const row of rows) {
    const href =
      row.target_type === "mission_log"
        ? `${baseUrl}/missions/${row.mission_slug}/${row.slug}`
        : `${baseUrl}/${row.target_type === "mission" ? "missions" : "archive"}/${row.slug}`;
    const entry = byUser.get(row.user_id) ?? {
      email: row.email,
      name: row.name,
      emailEnabled: row.email_notifications_enabled,
      pushEnabled: row.push_notifications_enabled,
      items: [],
    };
    entry.items.push({ title: row.title, href });
    byUser.set(row.user_id, entry);
  }

  console.log(`\n📧 Sende Abo-Benachrichtigungen an ${byUser.size} Nutzer...`);
  for (const [userId, { email, name, emailEnabled, pushEnabled, items }] of byUser) {
    if (emailEnabled) {
      const result = await sendSubscriptionDigest({ to: email, name, items });
      if (!result.sent) {
        console.warn(`  ⚠ Mail an ${email} fehlgeschlagen: ${result.error}`);
      } else {
        console.log(`  ✓ ${email} (${items.length} Änderung(en))`);
      }
    }

    if (pushEnabled) {
      const url = items.length === 1 ? items[0].href : `${baseUrl}/users/${userId}`;
      await sendPushToUser(sql, userId, {
        title: "Neuigkeiten im Neo Archive",
        body: `${items.length} Änderung${items.length === 1 ? "" : "en"} bei deinen Abos`,
        url,
      });
    }
  }
}
