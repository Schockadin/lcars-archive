"use server";
import { revalidatePath } from "next/cache";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import { getOwnCharacterStats, updateOwnCharacterRuleModules } from "@/lib/characters";
import { getCampaignRuleModule, moduleSupportsCharacterRole } from "@/lib/campaignRuleModules";
import { getApAccount } from "@/lib/characterAp";
import { revalidateCharacter } from "@/lib/revalidate";
import { characterEditHref } from "@/lib/contentRoutes";
import type { RuleModuleCharacterData } from "@/types/characterStats";

export interface RuleModuleCharacterState {
  error?: string;
  success?: string;
}

export async function saveCharacterRuleModuleAction(
  _state: RuleModuleCharacterState,
  formData: FormData,
): Promise<RuleModuleCharacterState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);
  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId) || characterId < 1) return { error: "Ungültiger Charakter." };
  const moduleId = String(formData.get("moduleId") ?? "");
  const campaignModule = await getCampaignRuleModule(moduleId);
  if (!campaignModule?.enabled) return { error: "Dieses Regelmodul ist nicht aktiviert." };
  const character = await getOwnCharacterStats(session.userId, characterId);
  if (!character) return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  if (!moduleSupportsCharacterRole(campaignModule.definition, character.stats.characterRole)) {
    return { error: "Dieses Modul passt nicht zur Rolle des Charakters." };
  }

  const knownTalents = new Set(campaignModule.definition.talents.map((item) => item.id));
  const repeatableTalents = campaignModule.definition.talents.filter((item) => item.repeatable);
  const selectedTalents = [...new Set(formData.getAll("selectedTalent").map(String))];
  for (const talent of repeatableTalents) {
    const rawCount = String(formData.get(`talentCount:${talent.id}`) ?? "0").trim();
    if (!/^\d{1,2}$/.test(rawCount) || Number(rawCount) > 20) {
      return { error: `${talent.name}: gültige Anzahl zwischen 0 und 20 angeben.` };
    }
    for (let count = 0; count < Number(rawCount); count += 1) selectedTalents.push(talent.id);
  }
  if (selectedTalents.some((id) => !knownTalents.has(id))) {
    return { error: "Die Talentauswahl enthält einen ungültigen Moduleintrag." };
  }
  const knownStatuses = new Set(campaignModule.definition.statuses.map((item) => item.id));
  const selectedStatuses = [...new Set(formData.getAll("selectedStatus").map(String))];
  if (selectedStatuses.some((id) => !knownStatuses.has(id))) {
    return { error: "Die Statusauswahl enthält einen ungültigen Moduleintrag." };
  }

  const prestigeClass = String(formData.get("prestigeClass") ?? "") || null;
  const prestigeDefinition = prestigeClass
    ? campaignModule.definition.prestigeClasses.find((item) => item.id === prestigeClass)
    : undefined;
  if (prestigeClass && !prestigeDefinition) return { error: "Unbekannter Prestige-Pfad." };
  const allowedAbilities = new Set(prestigeDefinition?.abilities.map((item) => item.id) ?? []);
  const selectedAbilities = [...new Set(formData.getAll("prestigeAbility").map(String))];
  if (selectedAbilities.some((id) => !allowedAbilities.has(id))) {
    return { error: "Die Prestige-Auswahl passt nicht zum gewählten Pfad." };
  }
  if (selectedAbilities.length > 0) {
    const ap = await getApAccount(characterId);
    if (selectedAbilities.some((id) => (prestigeDefinition?.abilities.find((item) => item.id === id)?.ap ?? Number.MAX_SAFE_INTEGER) > ap.earned)) {
      return { error: "Ein Prestige-Talent ist auf der aktuellen AP-Stufe noch nicht freigeschaltet." };
    }
  }

  const resources: Record<string, number> = {};
  for (const resource of campaignModule.definition.resources) {
    // Die Technomage-PP haben ein eigenes, regelgeprüftes Ausgaben- und
    // Regenerationsformular. Sie werden nicht über das freie Ressourcenfeld geändert.
    if (moduleId === "technomage" && resource.id === "power-points") continue;
    const raw = String(formData.get(`resource:${resource.id}`) ?? "0").trim();
    if (!/^\d{1,6}$/.test(raw)) return { error: `${resource.name}: gib eine ganze Zahl zwischen 0 und 999999 ein.` };
    resources[resource.id] = Number(raw);
  }

  const previous = character.stats.ruleModules;
  const next: RuleModuleCharacterData = {
    resources,
    selectedTalents,
    selectedStatuses,
    prestigeClass,
    prestigeAbilities: selectedAbilities,
  };
  const saved = await updateOwnCharacterRuleModules(
    session.userId,
    characterId,
    previous,
    { ...previous, [moduleId]: next },
  );
  if (!saved) return { error: "Die Modulwerte wurden gerade geändert. Lade die Seite neu." };
  revalidateCharacter(saved.slug);
  revalidatePath(characterEditHref(characterId));
  return { success: "Modulwerte gespeichert." };
}
