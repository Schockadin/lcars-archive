import "server-only";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import sql from "@/lib/db";
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
  const [row] = await sql<{ advancement_rules: unknown }[]>`
    SELECT advancement_rules FROM campaign_settings WHERE id = TRUE
  `;
  return parseAdvancementRules(row?.advancement_rules ?? null);
}

export async function setAdvancementRules(rules: AdvancementRules): Promise<void> {
  await sql`
    INSERT INTO campaign_settings (id, advancement_rules, updated_at)
    VALUES (TRUE, ${sql.json(rules as unknown as ReturnType<typeof JSON.parse>)}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET advancement_rules = ${sql.json(rules as unknown as ReturnType<typeof JSON.parse>)}, updated_at = NOW()
  `;
  revalidateTag(cacheTags.campaign, { expire: 0 });
}

// Zurück auf die eingebauten Standardwerte (Spalte auf NULL) — nicht die
// Standardwerte hineinschreiben, damit eine spätere Anpassung der Defaults im
// Code auch bei zurückgesetzten Kampagnen greift.
export async function resetAdvancementRules(): Promise<void> {
  await sql`
    UPDATE campaign_settings SET advancement_rules = NULL, updated_at = NOW()
    WHERE id = TRUE
  `;
  revalidateTag(cacheTags.campaign, { expire: 0 });
}

export { DEFAULT_ADVANCEMENT_RULES };
