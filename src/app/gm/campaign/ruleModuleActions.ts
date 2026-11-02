"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  deleteCampaignRuleModule,
  getCampaignRuleModule,
  isBaseRuleModule,
  resetBaseCampaignRuleModule,
  saveCampaignRuleModule,
} from "@/lib/campaignRuleModules";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import { validateRuleModuleDefinition } from "@/lib/ruleModuleTypes";

export interface RuleModuleActionState {
  error?: string;
  success?: boolean;
}

export async function createCampaignRuleModuleAction(
  _state: RuleModuleActionState,
  formData: FormData,
): Promise<RuleModuleActionState> {
  const user = await requireGM();
  const name = String(formData.get("name") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const roles = String(formData.get("characterRoles") ?? "*")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  if (!name || name.length > 200) return { error: "Gib einen Namen mit maximal 200 Zeichen ein." };
  if (summary.length > 2000) return { error: "Die Kurzbeschreibung darf maximal 2000 Zeichen enthalten." };
  if (roles.length === 0 || roles.some((role) => role.length > 100)) {
    return { error: "Gib mindestens eine passende Charakterrolle an (oder * für alle Rollen)." };
  }
  const id = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");
  if (!id) return { error: "Aus dem Namen konnte keine gültige Modul-ID gebildet werden." };
  if (await getCampaignRuleModule(id)) return { error: `Ein Regelmodul mit der ID „${id}“ existiert bereits.` };

  const definition: RuleModuleDefinition = {
    id,
    name,
    summary,
    characterRoles: roles,
    rules: [],
    resources: [],
    statuses: [],
    talents: [],
    prestigeClasses: [],
    schools: [],
    spells: [],
  };
  await saveCampaignRuleModule(id, false, definition, user.id);
  revalidatePath("/gm/campaign");
  revalidatePath("/user/characters");
  return { success: true };
}

export async function saveCampaignRuleModuleAction(
  _state: RuleModuleActionState,
  formData: FormData,
): Promise<RuleModuleActionState> {
  const user = await requireGM();
  const moduleId = String(formData.get("moduleId") ?? "");
  const existingModule = await getCampaignRuleModule(moduleId);
  if (!existingModule) return { error: "Dieses Regelmodul existiert nicht mehr." };
  const raw = String(formData.get("definition") ?? "");
  if (raw.length > 4_000_000) return { error: "Die Moduldefinition ist zu groß (maximal 4 MB)." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { error: "Die Moduldefinition enthält kein gültiges JSON." };
  }
  const definition = validateRuleModuleDefinition(parsed, moduleId);
  if (!definition) {
    return { error: "Die Modulstruktur ist ungültig. Prüfe Regeln, Ressourcen, Talente, Prestige-Klassen, Schulen und Spells." };
  }
  const enabled = isBaseRuleModule(moduleId) || formData.get("enabled") === "true";
  await saveCampaignRuleModule(moduleId, enabled, definition, user.id);
  revalidatePath("/gm/campaign");
  revalidatePath("/user/characters");
  return { success: true };
}

export async function deleteCampaignRuleModuleAction(
  _state: RuleModuleActionState,
  formData: FormData,
): Promise<RuleModuleActionState> {
  const user = await requireGM();
  const moduleId = String(formData.get("moduleId") ?? "");
  if (isBaseRuleModule(moduleId)) {
    return { error: "Das STA-2e-Basismodul kann nicht gelöscht werden." };
  }
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(moduleId)) {
    return { error: "Ungültige Modul-ID." };
  }
  if (!(await getCampaignRuleModule(moduleId))) {
    return { error: "Dieses Regelmodul existiert nicht mehr." };
  }
  await deleteCampaignRuleModule(moduleId, user.id);
  revalidatePath("/gm/campaign");
  revalidatePath("/user/characters");
  return { success: true };
}

export async function resetBaseCampaignRuleModuleAction(
  _state: RuleModuleActionState,
  _formData: FormData,
): Promise<RuleModuleActionState> {
  await requireGM();
  await resetBaseCampaignRuleModule();
  revalidatePath("/gm/campaign");
  revalidatePath("/user/characters");
  return { success: true };
}
