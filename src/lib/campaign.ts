import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import sql from "@/lib/db";

// Die reine Alters-Ableitung lebt in campaignFormat.ts (React-/DB-frei,
// importierbar aus Client-Komponenten/Tests) und wird hier der Bequemlichkeit
// halber mit re-exportiert.
export { inferAgeFromDateOfBirth } from "@/lib/campaignFormat";

// Kampagnen-weite Einstellungen der Spielleitung (campaign_settings,
// Einzeilen-Tabelle). Aktuell nur das Ingame-Jahr, aus dem zusammen mit
// dem Geburtsdatum eines Charakters (characters.metadata.dateOfBirth) dessen
// angezeigtes Alter abgeleitet wird (inferAgeFromDateOfBirth in
// campaignFormat.ts, genutzt in CharacterHero.tsx). Die Spielleitung setzt das
// Jahr über /admin/campaign.

const CAMPAIGN_TAG = "campaign-settings";

// Das aktuelle Ingame-Jahr — null, solange die Spielleitung noch keins
// gesetzt hat. Gecacht (kampagnen-weit identisch für alle), invalidiert von
// setIngameYear.
export const getIngameYear = unstable_cache(
  async (): Promise<number | null> => {
    const [row] = await sql<{ ingame_year: number | null }[]>`
      SELECT ingame_year FROM campaign_settings WHERE id = TRUE
    `;
    return row?.ingame_year ?? null;
  },
  ["getIngameYear", "v1"],
  { tags: [CAMPAIGN_TAG] },
);

// Setzt das Ingame-Jahr (oder löscht es mit null). Upsert auf die eine Zeile.
export async function setIngameYear(year: number | null): Promise<void> {
  await sql`
    INSERT INTO campaign_settings (id, ingame_year, updated_at)
    VALUES (TRUE, ${year}, NOW())
    ON CONFLICT (id) DO UPDATE SET ingame_year = ${year}, updated_at = NOW()
  `;
  revalidateTag(CAMPAIGN_TAG, { expire: 0 });
}
