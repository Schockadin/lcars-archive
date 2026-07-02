import postgres from "postgres";
import { sendSubscriptionDigest } from "../../src/lib/mailCore.js";

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
  email: string;
  name: string;
  target_type: "mission" | "archive_entry";
  slug: string;
  title: string;
}

// Benachrichtigt Abonnenten geänderter Missionen/Archiv-Einträge nach einem
// Ingest-Lauf per Sammel-Mail (eine Mail pro User über alle Änderungen).
// Wird sowohl von changedMissionSlugs (Titel/Status/Zeitraum/Body geändert
// ODER neuer Mission-Log) als auch changedArchiveSlugs (Titel/Kategorie/
// Inhalt geändert) gespeist — "geändert" wird von den jeweiligen
// ingest*-Funktionen selbst bestimmt (siehe missions.ts/missionLogs.ts/
// archive.ts), notify.ts kümmert sich nur noch um Versand.
export async function notifySubscribers(
  sql: postgres.Sql,
  changedMissionSlugs: Set<string>,
  changedArchiveSlugs: Set<string>,
): Promise<void> {
  if (changedMissionSlugs.size === 0 && changedArchiveSlugs.size === 0) {
    return;
  }

  const rows = await sql<ChangedItemRow[]>`
    SELECT u.email, u.name, 'mission'::text AS target_type, m.slug, m.title
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    JOIN missions m ON m.slug = cf.target_slug
    WHERE cf.target_type = 'mission'
      AND cf.subscribed_at IS NOT NULL
      AND cf.target_slug = ANY(${[...changedMissionSlugs]})
    UNION ALL
    SELECT u.email, u.name, 'archive_entry'::text AS target_type, a.slug, a.title
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    JOIN archive_entries a ON a.slug = cf.target_slug
    WHERE cf.target_type = 'archive_entry'
      AND cf.subscribed_at IS NOT NULL
      AND cf.target_slug = ANY(${[...changedArchiveSlugs]})
  `;

  if (rows.length === 0) {
    console.log("📭 Keine Abonnenten für die geänderten Inhalte.");
    return;
  }

  const baseUrl = resolveBaseUrl();
  const byEmail = new Map<
    string,
    { name: string; items: { title: string; href: string }[] }
  >();

  for (const row of rows) {
    const href = `${baseUrl}/${row.target_type === "mission" ? "missions" : "archive"}/${row.slug}`;
    const entry = byEmail.get(row.email) ?? { name: row.name, items: [] };
    entry.items.push({ title: row.title, href });
    byEmail.set(row.email, entry);
  }

  console.log(`\n📧 Sende Abo-Benachrichtigungen an ${byEmail.size} Nutzer...`);
  for (const [email, { name, items }] of byEmail) {
    const result = await sendSubscriptionDigest({ to: email, name, items });
    if (!result.sent) {
      console.warn(`  ⚠ Mail an ${email} fehlgeschlagen: ${result.error}`);
    } else {
      console.log(`  ✓ ${email} (${items.length} Änderung(en))`);
    }
  }
}
