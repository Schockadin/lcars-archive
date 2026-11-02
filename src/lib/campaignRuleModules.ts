import "server-only";
import sql from "@/lib/db";
import { revalidateTag } from "next/cache";
import { TECHNOMAGE_RULE_MODULE } from "@/lib/technomageRuleModule";
import type {
  CampaignRuleModule,
  RuleModuleDefinition,
} from "@/lib/ruleModuleTypes";
import { validateRuleModuleDefinition } from "@/lib/ruleModuleTypes";

const DEFINITIONS: Record<string, RuleModuleDefinition> = {
  technomage: TECHNOMAGE_RULE_MODULE,
};

export const RULE_MODULES_TAG = "campaign-rule-modules";

function parseDefinition(value: unknown, id: string): RuleModuleDefinition | null {
  const parsed = typeof value === "string" ? (() => {
    try { return JSON.parse(value) as unknown; } catch { return null; }
  })() : value;
  return validateRuleModuleDefinition(parsed, id);
}

export async function getCampaignRuleModule(id: string): Promise<CampaignRuleModule | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) return null;
  const fallback = DEFINITIONS[id];
  const [row] = await sql<{
    enabled: boolean;
    definition: unknown;
    updated_at: Date | string | null;
  }[]>`
    SELECT enabled, definition, updated_at
    FROM campaign_rule_modules
    WHERE id = ${id}
  `;
  const definition = row ? parseDefinition(row.definition, id) : null;
  if (!definition && !fallback) return null;
  return {
    enabled: row?.enabled ?? true,
    definition: definition ?? fallback,
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function listCampaignRuleModules(): Promise<CampaignRuleModule[]> {
  const rows = await sql<{
    id: string;
    enabled: boolean;
    definition: unknown;
    updated_at: Date | string | null;
  }[]>`
    SELECT id, enabled, definition, updated_at
    FROM campaign_rule_modules
  `;
  const modules = new Map<string, CampaignRuleModule>();
  for (const [id, definition] of Object.entries(DEFINITIONS)) {
    modules.set(id, { enabled: true, definition, updatedAt: null });
  }
  for (const row of rows) {
    const definition = parseDefinition(row.definition, row.id);
    if (!definition) continue;
    modules.set(row.id, {
      enabled: row.enabled,
      definition,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    });
  }
  return [...modules.values()];
}

export async function saveCampaignRuleModule(
  id: string,
  enabled: boolean,
  definition: RuleModuleDefinition,
  editorId: number,
): Promise<void> {
  await sql`
    INSERT INTO campaign_rule_modules (id, enabled, definition, updated_by, updated_at)
    VALUES (${id}, ${enabled}, ${sql.json(definition as unknown as ReturnType<typeof JSON.parse>)}, ${editorId}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET enabled = EXCLUDED.enabled,
          definition = EXCLUDED.definition,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
  `;
  revalidateTag(RULE_MODULES_TAG, { expire: 0 });
}

export function moduleSupportsCharacterRole(
  definition: RuleModuleDefinition,
  role: string | null,
): boolean {
  if (!role) return definition.characterRoles.some((item) => item.trim() === "*");
  const normalize = (value: string) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const candidate = normalize(role);
  return definition.characterRoles.some((item) => {
    if (item.trim() === "*") return true;
    const expected = normalize(item);
    return candidate === expected ||
      (expected.length >= 5 && candidate.includes(expected));
  });
}

