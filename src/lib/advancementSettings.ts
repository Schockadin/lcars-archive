import "server-only";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import orm from "@/lib/orm";
import { campaignSettings } from "@/lib/ormSchema";
import { cacheTags } from "@/lib/cacheTags";
import {
  parseAdvancementRules,
  DEFAULT_ADVANCEMENT_RULES,
  type AdvancementRules,
} from "@/lib/advancement";

// Das AP-Regelwerk der Runde liegt in campaign_settings.advancement_rules
// (jsonb, NULL = die eingebauten Standardwerte gelten). Die Spielleitung
// stellt es unter /gm/ap ein; gelesen wird es vom Charakterbogen (Kosten,
// Erschaffungsbudget), von der AP-Vergabe und von /gm/sessions.
//
// Die reinen Regeln selbst (Typ, Standardwerte, Kostenformeln, Prüfung) leben
// in src/lib/advancement.ts — hier geht es nur um Laden und Speichern.

// Gecacht unter demselben Tag wie die übrigen Kampagnen-Einstellungen: das
// Regelwerk ist kampagnenweit identisch und ändert sich selten.
export async function getAdvancementRules(): Promise<AdvancementRules> {
  "use cache";
  cacheTag(cacheTags.campaign);
  cacheLife("max");
  const [row] = await orm
    .select({ advancementRules: campaignSettings.advancementRules })
    .from(campaignSettings)
    .where(eq(campaignSettings.id, true));
  return parseAdvancementRules(row?.advancementRules ?? null);
}

export async function setAdvancementRules(
  rules: AdvancementRules,
): Promise<void> {
  await orm
    .insert(campaignSettings)
    .values({ id: true, advancementRules: rules })
    .onConflictDoUpdate({
      target: campaignSettings.id,
      set: { advancementRules: rules, updatedAt: sql`NOW()` },
    });
  revalidateTag(cacheTags.campaign, { expire: 0 });
}

// Zurück auf die eingebauten Standardwerte (Spalte auf NULL) — nicht die
// Standardwerte hineinschreiben, damit eine spätere Anpassung der Defaults im
// Code auch bei zurückgesetzten Kampagnen greift.
export async function resetAdvancementRules(): Promise<void> {
  await orm
    .update(campaignSettings)
    .set({ advancementRules: null, updatedAt: sql`NOW()` })
    .where(eq(campaignSettings.id, true));
  revalidateTag(cacheTags.campaign, { expire: 0 });
}

export { DEFAULT_ADVANCEMENT_RULES };
