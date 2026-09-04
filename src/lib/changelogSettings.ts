import "server-only";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";

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
