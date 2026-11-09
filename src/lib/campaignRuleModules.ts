import "server-only";
import sql from "@/lib/db";
import { revalidateTag } from "next/cache";
import { BASE_RULE_MODULE, BASE_RULE_MODULE_ID } from "@/lib/baseRuleModule";
import { TECHNOMAGE_RULE_MODULE } from "@/lib/technomageRuleModule";
import type {
  CampaignRuleModule,
  RuleModuleDefinition,
} from "@/lib/ruleModuleTypes";
import { validateRuleModuleDefinition } from "@/lib/ruleModuleTypes";
export { moduleSupportsCharacterRole } from "@/lib/ruleModuleTypes";

const DEFINITIONS: Record<string, RuleModuleDefinition> = {
  [BASE_RULE_MODULE_ID]: BASE_RULE_MODULE,
  technomage: TECHNOMAGE_RULE_MODULE,
};

const DELETED_BUILTIN_MARKER = "__campaignRuleModuleDeleted";

export const RULE_MODULES_TAG = "campaign-rule-modules";

function parseDefinition(value: unknown, id: string): RuleModuleDefinition | null {
  const parsed = typeof value === "string" ? (() => {
    try { return JSON.parse(value) as unknown; } catch { return null; }
  })() : value;
  return validateRuleModuleDefinition(parsed, id);
}

function isDeletedBuiltin(value: unknown, id: string): boolean {
  const parsed = typeof value === "string" ? (() => {
    try { return JSON.parse(value) as unknown; } catch { return null; }
  })() : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const row = parsed as Record<string, unknown>;
  return row.id === id && row[DELETED_BUILTIN_MARKER] === true;
}

export function isBaseRuleModule(id: string): boolean {
  return id === BASE_RULE_MODULE_ID;
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
  if (row && !isBaseRuleModule(id) && isDeletedBuiltin(row.definition, id)) return null;
  const definition = row ? parseDefinition(row.definition, id) : null;
  if (!definition && !fallback) return null;
  return {
    enabled: isBaseRuleModule(id) ? true : row?.enabled ?? true,
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
  const deletedBuiltins = new Set<string>();
  for (const row of rows) {
    if (!isBaseRuleModule(row.id) && isDeletedBuiltin(row.definition, row.id)) {
      deletedBuiltins.add(row.id);
      modules.delete(row.id);
      continue;
    }
    const definition = parseDefinition(row.definition, row.id);
    if (!definition) continue;
    modules.set(row.id, {
      enabled: isBaseRuleModule(row.id) ? true : row.enabled,
      definition,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    });
  }
  for (const id of deletedBuiltins) modules.delete(id);
  return [...modules.values()];
}

export async function saveCampaignRuleModule(
  id: string,
  enabled: boolean,
  definition: RuleModuleDefinition,
  editorId: number,
): Promise<void> {
  const effectiveEnabled = isBaseRuleModule(id) ? true : enabled;
  await sql`
    INSERT INTO campaign_rule_modules (id, enabled, definition, updated_by, updated_at)
    VALUES (${id}, ${effectiveEnabled}, ${sql.json(definition as unknown as ReturnType<typeof JSON.parse>)}, ${editorId}, NOW())
    ON CONFLICT (id) DO UPDATE
      SET enabled = EXCLUDED.enabled,
          definition = EXCLUDED.definition,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
  `;
  revalidateTag(RULE_MODULES_TAG, { expire: 0 });
}

/** Delete a campaign module. Built-ins use a JSON tombstone so their bundled fallback stays deleted. */
export async function deleteCampaignRuleModule(
  id: string,
  editorId: number,
): Promise<void> {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id) || isBaseRuleModule(id)) return;
  if (DEFINITIONS[id]) {
    const tombstone = { id, [DELETED_BUILTIN_MARKER]: true };
    await sql`
      INSERT INTO campaign_rule_modules (id, enabled, definition, updated_by, updated_at)
      VALUES (${id}, FALSE, ${sql.json(tombstone as unknown as ReturnType<typeof JSON.parse>)}, ${editorId}, NOW())
      ON CONFLICT (id) DO UPDATE
        SET enabled = FALSE,
            definition = EXCLUDED.definition,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
    `;
  } else {
    await sql`DELETE FROM campaign_rule_modules WHERE id = ${id}`;
  }
  revalidateTag(RULE_MODULES_TAG, { expire: 0 });
}

/** Remove the editable override and restore the immutable bundled STA 2e defaults. */
export async function resetBaseCampaignRuleModule(): Promise<void> {
  await sql`DELETE FROM campaign_rule_modules WHERE id = ${BASE_RULE_MODULE_ID}`;
  revalidateTag(RULE_MODULES_TAG, { expire: 0 });
}
