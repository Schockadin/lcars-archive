import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import orm from "@/lib/orm";
import { campaignSettings } from "@/lib/ormSchema";
import { cacheTags } from "@/lib/cacheTags";
import {
  DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
  parseTechnomageSpellSlotRules,
  type TechnomageSpellSlotRules,
} from "@/lib/technomageSpellSlotRules";

// Die Slotregeln gelten kampagnenweit. NULL lässt die dokumentierten
// Fact-Book-Standardwerte greifen; gespeichert wird nur eine GM-Anpassung.
export async function getTechnomageSpellSlotRules(): Promise<TechnomageSpellSlotRules> {
  "use cache";
  cacheTag(cacheTags.campaign);
  cacheLife("max");
  const [row] = await orm
    .select({ rules: campaignSettings.technomageSpellRules })
    .from(campaignSettings)
    .where(eq(campaignSettings.id, true));
  return parseTechnomageSpellSlotRules(
    row?.rules ?? DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
  );
}

export async function setTechnomageSpellSlotRules(
  rules: TechnomageSpellSlotRules,
): Promise<void> {
  await orm
    .insert(campaignSettings)
    .values({ id: true, technomageSpellRules: rules })
    .onConflictDoUpdate({
      target: campaignSettings.id,
      set: { technomageSpellRules: rules, updatedAt: sql`NOW()` },
    });
  revalidateTag(cacheTags.campaign, { expire: 0 });
}

export async function resetTechnomageSpellSlotRules(): Promise<void> {
  await orm
    .update(campaignSettings)
    .set({ technomageSpellRules: null, updatedAt: sql`NOW()` })
    .where(eq(campaignSettings.id, true));
  revalidateTag(cacheTags.campaign, { expire: 0 });
}
