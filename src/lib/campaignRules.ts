import "server-only";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import postgres from "postgres";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import {
  byRuleOrder,
  type CampaignRule,
  type CampaignRuleInput,
} from "@/lib/campaignRuleTypes";

// Datenzugriff auf die eigenen Regeln der Runde (Tabelle campaign_rules,
// siehe scripts/schema.sql). Die reine Hälfte — Validierung, Sortierung —
// liegt in src/lib/campaignRuleTypes.ts. Aufgebaut wie src/lib/focuses.ts.

export class RuleNameTakenError extends Error {}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof postgres.PostgresError && err.code === "23505";
}

const SELECT_COLUMNS = sql`id, name, body, sort_order AS "sortOrder"`;

export {
  RULE_NAME_MAX,
  RULE_BODY_MAX,
  validateCampaignRuleInput,
  byRuleOrder,
} from "@/lib/campaignRuleTypes";
export type {
  CampaignRule,
  CampaignRuleInput,
} from "@/lib/campaignRuleTypes";

// Alle Regeln. Gecacht: sie ändern sich nur über /gm/rules und stehen auf
// jedem Spickzettel.
export async function listCampaignRules(): Promise<CampaignRule[]> {
  "use cache";
  cacheTag(cacheTags.campaignRules);
  cacheLife("max");
  const rows = await sql<CampaignRule[]>`
    SELECT ${SELECT_COLUMNS} FROM campaign_rules
  `;
  return rows.sort(byRuleOrder);
}

// Ungecachte Variante für die Bearbeitungsseite der Spielleitung — dort muss
// eine gerade gespeicherte Änderung sofort dastehen (wie listFocusesFresh).
export async function listCampaignRulesFresh(): Promise<CampaignRule[]> {
  const rows = await sql<CampaignRule[]>`
    SELECT ${SELECT_COLUMNS} FROM campaign_rules
  `;
  return rows.sort(byRuleOrder);
}

export async function createCampaignRule(
  input: CampaignRuleInput,
  createdByUserId: number,
): Promise<CampaignRule> {
  try {
    const [row] = await sql<CampaignRule[]>`
      INSERT INTO campaign_rules (name, body, sort_order, created_by)
      VALUES (${input.name}, ${input.body}, ${input.sortOrder}, ${createdByUserId})
      RETURNING ${SELECT_COLUMNS}
    `;
    revalidateTag(cacheTags.campaignRules, { expire: 0 });
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new RuleNameTakenError(input.name);
    throw err;
  }
}

export async function updateCampaignRule(
  id: number,
  input: CampaignRuleInput,
): Promise<boolean> {
  try {
    const rows = await sql`
      UPDATE campaign_rules
      SET name = ${input.name}, body = ${input.body},
          sort_order = ${input.sortOrder}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
    revalidateTag(cacheTags.campaignRules, { expire: 0 });
    return rows.length > 0;
  } catch (err) {
    if (isUniqueViolation(err)) throw new RuleNameTakenError(input.name);
    throw err;
  }
}

// Anders als bei Talenten und Schwerpunkten ist hier JEDE Regel löschbar: sie
// steht auf keinem Charakterbogen als Eintrag, sondern erscheint auf allen
// Spickzetteln gleich — sie zu entfernen entwertet also keine gepflegten
// Daten.
export async function deleteCampaignRule(id: number): Promise<boolean> {
  const rows = await sql`
    DELETE FROM campaign_rules WHERE id = ${id} RETURNING id
  `;
  revalidateTag(cacheTags.campaignRules, { expire: 0 });
  return rows.length > 0;
}
