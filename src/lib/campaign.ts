import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";

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

// Auch von der Log-Inferenz abhängig: Der Tag wird deshalb ZUSÄTZLICH
// invalidiert, sobald sich Mission-Log-Daten ändern (revalidateLog schließt
// cacheTags.campaign mit ein) — damit das automatisch abgeleitete Jahr frisch
// bleibt.
const CAMPAIGN_TAG = cacheTags.campaign;

// Gespeichertes Jahr aus campaign_settings — non-null = MANUELLER Override,
// null = AUTO (aus dem spätesten Mission-Log abgeleitet).
async function getStoredIngameYear(): Promise<number | null> {
  const [row] = await sql<{ ingame_year: number | null }[]>`
    SELECT ingame_year FROM campaign_settings WHERE id = TRUE
  `;
  return row?.ingame_year ?? null;
}

// Aus dem chronologisch spätesten (nicht gelöschten) Mission-Log abgeleitetes
// Jahr — null, wenn es noch keinen Log mit Datum gibt.
async function getInferredIngameYear(): Promise<number | null> {
  const [row] = await sql<{ year: number | null }[]>`
    SELECT EXTRACT(YEAR FROM MAX(log_date))::int AS year
    FROM mission_logs WHERE deleted_at IS NULL
  `;
  return row?.year ?? null;
}

// Das effektiv geltende Ingame-Jahr: manueller Override, falls gesetzt, sonst
// das automatisch aus dem spätesten Mission-Log abgeleitete Jahr. Gecacht
// (kampagnen-weit identisch), invalidiert von setIngameYear UND von
// Mission-Log-Änderungen (revalidateCampaignYear).
export const getIngameYear = unstable_cache(
  async (): Promise<number | null> => {
    const stored = await getStoredIngameYear();
    if (stored != null) return stored;
    return getInferredIngameYear();
  },
  ["getIngameYear", "v2"],
  { tags: [CAMPAIGN_TAG] },
);

export interface IngameYearInfo {
  // Was tatsächlich gilt (Override oder abgeleitet).
  effectiveYear: number | null;
  // true = kein manueller Override → automatisch aus dem spätesten Log.
  isAuto: boolean;
  // Das aus dem spätesten Log abgeleitete Jahr (für die Anzeige der
  // Auto-Option, auch wenn gerade ein Override aktiv ist).
  inferredYear: number | null;
}

// Für den Kampagnen-Editor (IngameYearForm) — ungecacht, damit der Modus
// (Auto/Manuell) und die abgeleitete Zahl immer aktuell angezeigt werden.
export async function getIngameYearInfo(): Promise<IngameYearInfo> {
  const [stored, inferred] = await Promise.all([
    getStoredIngameYear(),
    getInferredIngameYear(),
  ]);
  const isAuto = stored == null;
  return {
    effectiveYear: isAuto ? inferred : stored,
    isAuto,
    inferredYear: inferred,
  };
}

// Setzt einen MANUELLEN Override (year) oder schaltet auf AUTO zurück (null).
// Upsert auf die eine Zeile.
export async function setIngameYear(year: number | null): Promise<void> {
  await sql`
    INSERT INTO campaign_settings (id, ingame_year, updated_at)
    VALUES (TRUE, ${year}, NOW())
    ON CONFLICT (id) DO UPDATE SET ingame_year = ${year}, updated_at = NOW()
  `;
  revalidateTag(CAMPAIGN_TAG, { expire: 0 });
}
