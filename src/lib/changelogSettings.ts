import "server-only";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { isChangelogCategory } from "@/lib/changelogCategories";

// Welche Changelog-Versionen ein Admin unter /admin/changelog für die „Neue
// Funktionen"-Box auf dem Dashboard ausgewählt hat, liegt in
// campaign_settings.changelog_featured_versions (JSONB-Array von
// „Major.Minor"-Strings). NULL = nie konfiguriert ⇒ der Aufrufer nutzt den
// Default (nur die jüngste Version, siehe featuredChangelogEntries in
// src/lib/changelog.ts). Ein leeres Array bedeutet dagegen bewusst „nichts
// anzeigen" — die Box verschwindet dann.
//
// Die Changelog-Einträge selbst sind code-gepflegt (src/lib/changelog.ts);
// hier wird nur die Auswahl der sichtbaren Versionen gespeichert.

// Gecacht unter eigenem Tag, invalidiert nur beim Speichern der Auswahl.
export async function getFeaturedChangelogVersions(): Promise<string[] | null> {
  "use cache";
  cacheTag(cacheTags.changelog);
  cacheLife("max");
  const [row] = await sql<{ changelog_featured_versions: unknown }[]>`
    SELECT changelog_featured_versions FROM campaign_settings WHERE id = TRUE
  `;
  return normalizeFeaturedVersions(row?.changelog_featured_versions ?? null);
}

// Beliebiges (ggf. aus der DB stammendes) Feld auf ein String-Array oder null
// herunterfiltern — NULL/Nicht-Array ⇒ null (Default gilt), sonst nur die
// String-Einträge.
function normalizeFeaturedVersions(raw: unknown): string[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  return raw.filter((v): v is string => typeof v === "string");
}

export async function setFeaturedChangelogVersions(
  versions: string[],
): Promise<void> {
  await sql`
    INSERT INTO campaign_settings (id, changelog_featured_versions, updated_at)
    VALUES (TRUE, ${sql.json(versions as unknown as ReturnType<typeof JSON.parse>)}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET changelog_featured_versions = ${sql.json(versions as unknown as ReturnType<typeof JSON.parse>)},
          updated_at = NOW()
  `;
  revalidateTag(cacheTags.changelog, { expire: 0 });
}


// ── Je Rolle ausgeblendete Kategorien ────────────────────────────────
// campaign_settings.changelog_hidden_categories hält eine Zuordnung
// Rollen-Schlüssel → Kategorien, die für diese Rolle NICHT in der Box „Neue
// Funktionen" erscheinen. Die vollständige Liste unter /changelog bleibt
// davon unberührt — sie ist öffentlich und soll nichts verschweigen; hier
// geht es darum, wen auf dem Dashboard womit behelligt wird.
//
// Fehlt die Spalte oder steht dort nichts, ist nichts ausgeblendet.
export type HiddenChangelogCategories = Record<string, string[]>;

export async function getHiddenChangelogCategories(): Promise<HiddenChangelogCategories> {
  "use cache";
  cacheTag(cacheTags.changelog);
  cacheLife("max");
  const [row] = await sql<{ changelog_hidden_categories: unknown }[]>`
    SELECT changelog_hidden_categories FROM campaign_settings WHERE id = TRUE
  `;
  return normalizeHiddenCategories(row?.changelog_hidden_categories ?? null);
}

// Aus der DB kommt beliebiges JSON. Übernommen werden nur Zuordnungen der
// erwarteten Form, und dort nur bekannte Kategorien — eine umbenannte oder
// entfernte Kategorie darf nicht als Geisterfilter weiterwirken.
export function normalizeHiddenCategories(
  raw: unknown,
): HiddenChangelogCategories {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: HiddenChangelogCategories = {};
  for (const [role, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const categories = value.filter(isChangelogCategory);
    if (categories.length > 0) result[role] = categories;
  }
  return result;
}

export async function setHiddenChangelogCategories(
  hidden: HiddenChangelogCategories,
): Promise<void> {
  const clean = normalizeHiddenCategories(hidden);
  await sql`
    INSERT INTO campaign_settings (id, changelog_hidden_categories, updated_at)
    VALUES (TRUE, ${sql.json(clean as unknown as ReturnType<typeof JSON.parse>)}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET changelog_hidden_categories = ${sql.json(clean as unknown as ReturnType<typeof JSON.parse>)},
          updated_at = NOW()
  `;
  revalidateTag(cacheTags.changelog, { expire: 0 });
}
