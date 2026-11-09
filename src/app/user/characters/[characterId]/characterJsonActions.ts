"use server";

import { revalidatePath } from "next/cache";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import {
  getOwnCharacterForEdit,
  getOwnCharacterStats,
  notifyCharacterSubscribers,
  updateOwnCharacterContent,
} from "@/lib/characters";
import { parseCharacterJsonFile, type CharacterJsonData } from "@/lib/characterJson";
import { getApAccount } from "@/lib/characterAp";
import { getUserById } from "@/lib/users";
import { notifyContentChange } from "@/lib/follows";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listTalents } from "@/lib/talents";
import { listFocuses } from "@/lib/focuses";
import { listCampaignRuleModules, moduleSupportsCharacterRole } from "@/lib/campaignRuleModules";
import { getTechnomageSpell } from "@/lib/technomageSpellCatalog";
import {
  createSpellPurchasePlan,
  effectiveTechnomagePowerPoints,
  technomageKnownSpellLimit,
  technomageLevelFromAp,
  technomagePowerPointMaximum,
} from "@/lib/technomageSpellRules";
import { checkOpenCreationStats } from "@/lib/characterStatsRules";
import { applySta2eLifepath } from "@/lib/sta2eLifepath";
import { getSpeciesLabel } from "@/lib/sta2eCharacterOptions";
import { validateCharacterStats } from "@/lib/characterStats";
import { revalidateCharacter } from "@/lib/revalidate";
import { revalidatePathAndNotify } from "@/lib/realtimeServer";
import { syncAutolinksAfterRename } from "@/lib/autolinkSync";
import { characterEditHref } from "@/lib/contentRoutes";
import type { CharacterStats, RuleModuleCharacterData } from "@/types/characterStats";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";

export interface CharacterJsonActionState {
  error?: string;
  success?: string;
}

function readCharacterId(formData: FormData): number | null {
  const value = Number(formData.get("characterId"));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function sameJson(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function validateRuleModuleData(
  id: string,
  data: RuleModuleCharacterData,
  definition: RuleModuleDefinition,
  earnedAp: number,
): string | null {
  const talents = new Map(definition.talents.map((talent) => [talent.id, talent]));
  const talentCounts = new Map<string, number>();
  for (const talentId of data.selectedTalents) {
    const talent = talents.get(talentId);
    if (!talent) return `${id}: Die Modulauswahl enthält ein unbekanntes Talent.`;
    const count = (talentCounts.get(talentId) ?? 0) + 1;
    talentCounts.set(talentId, count);
    if (!talent.repeatable && count > 1) return `${id}: Ein Modultalent darf nicht mehrfach gewählt sein.`;
    if (talent.repeatable && count > 20) return `${id}: Ein wiederholbares Modultalent ist mehr als 20-mal gewählt.`;
  }

  const statuses = new Set(definition.statuses.map((status) => status.id));
  if (data.selectedStatuses.some((status) => !statuses.has(status))) {
    return `${id}: Die Modulauswahl enthält einen unbekannten Status.`;
  }

  const collections = new Map(definition.collections.map((collection) => [collection.id, collection]));
  for (const [collectionId, selectedIds] of Object.entries(data.selectedCollectionEntries)) {
    const collection = collections.get(collectionId);
    const entries = new Set(collection?.entries.map((entry) => entry.id) ?? []);
    if (!collection || selectedIds.some((entryId) => !entries.has(entryId))) {
      return `${id}: Die Modulauswahl enthält einen unbekannten Inhaltsbereich-Eintrag.`;
    }
  }

  const prestige = data.prestigeClass
    ? definition.prestigeClasses.find((item) => item.id === data.prestigeClass)
    : undefined;
  if (data.prestigeClass && !prestige) return `${id}: Der Prestige-Pfad ist nicht verfügbar.`;
  const abilities = new Map(prestige?.abilities.map((item) => [item.id, item]) ?? []);
  if (data.prestigeAbilities.some((ability) => !abilities.has(ability))) {
    return `${id}: Ein Prestige-Talent passt nicht zum gewählten Pfad.`;
  }
  if (data.prestigeAbilities.some((ability) => (abilities.get(ability)?.ap ?? Number.MAX_SAFE_INTEGER) > earnedAp)) {
    return `${id}: Ein Prestige-Talent ist auf der aktuellen AP-Stufe noch nicht freigeschaltet.`;
  }

  const resources = new Set(definition.resources.map((resource) => resource.id));
  if (Object.entries(data.resources).some(([resourceId, value]) =>
    !resources.has(resourceId) ||
    (id === "technomage" && resourceId === "power-points") ||
    !Number.isSafeInteger(value) || value < 0 || value > 999_999,
  )) {
    return `${id}: Die Ressourcen enthalten einen unbekannten oder ungültigen Wert.`;
  }
  return null;
}

async function validateRuleModuleImports(
  stats: CharacterStats,
  current: CharacterStats,
  modules: Awaited<ReturnType<typeof listCampaignRuleModules>>,
  earnedAp: number,
): Promise<string | null> {
  const moduleIds = new Set([
    ...Object.keys(stats.ruleModules),
    ...Object.keys(current.ruleModules),
  ]);
  for (const id of moduleIds) {
    const next = stats.ruleModules[id] ?? {
      resources: {}, selectedTalents: [], selectedStatuses: [],
      selectedCollectionEntries: {},
      prestigeClass: null, prestigeAbilities: [],
    };
    const previous = current.ruleModules[id] ?? {
      resources: {}, selectedTalents: [], selectedStatuses: [],
      selectedCollectionEntries: {},
      prestigeClass: null, prestigeAbilities: [],
    };
    if (sameJson(next, previous)) continue;

    const ruleModule = modules.find((item) => item.definition.id === id);
    if (!ruleModule?.enabled || !moduleSupportsCharacterRole(ruleModule.definition, stats.characterRole)) {
      return `${id}: Dieses Regelmodul ist für den Charakter nicht aktiv; seine Daten können nicht importiert werden.`;
    }
    const error = validateRuleModuleData(id, next, ruleModule.definition, earnedAp);
    if (error) return error;
  }
  return null;
}

async function validateTechnomageImport(
  stats: CharacterStats,
  current: CharacterStats,
  modules: Awaited<ReturnType<typeof listCampaignRuleModules>>,
  earnedAp: number,
): Promise<string | null> {
  const next = stats.technomage;
  const previous = current.technomage;
  if (sameJson(next, previous)) return null;

  const ruleModule = modules.find((item) => item.definition.id === "technomage");
  if (!ruleModule?.enabled || !moduleSupportsCharacterRole(ruleModule.definition, stats.characterRole)) {
    return "Technomage-Daten können nur bei aktivem, passendem Regelmodul importiert werden.";
  }
  if (previous.primarySchool && (
    next.primarySchool !== previous.primarySchool ||
    !sameJson(next.weakSchools, previous.weakSchools)
  )) {
    return "Eine bereits festgelegte Technomage-Schulauswahl kann nicht geändert werden.";
  }
  if (next.primarySchool) {
    if (next.weakSchools.length !== 3 || new Set(next.weakSchools).size !== 3 || next.weakSchools.includes(next.primarySchool)) {
      return "Die Technomage-Schulauswahl benötigt eine Primärschule und drei verschiedene schwache Schulen.";
    }
  } else if (next.weakSchools.length > 0 || next.spells.length > 0) {
    return "Schwache Schulen und Spells benötigen eine Primärschule.";
  }
  if (previous.spells.some((spell) => !next.spells.includes(spell))) {
    return "Bereits gelernte Spells können beim Import nicht entfernt werden.";
  }

  const level = technomageLevelFromAp(earnedAp);
  const spellLimit = technomageKnownSpellLimit(level, stats.attributes.reason);
  const learned = new Set(previous.spells);
  const pending = next.spells.filter((spell) => !learned.has(spell));
  for (const spellId of pending) {
    if (!getTechnomageSpell(spellId, ruleModule.definition.spells)) {
      return "Die Spell-Liste enthält einen im aktiven Modul unbekannten Spell.";
    }
  }
  while (pending.length > 0) {
    let progressed = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const spellId = pending[index];
      const plan = createSpellPurchasePlan({
        spellId,
        knownSpellIds: [...learned],
        knownSpellLimit: spellLimit,
        primarySchool: next.primarySchool,
        weakSchools: next.weakSchools,
        spells: ruleModule.definition.spells,
      });
      if (!plan.ok) continue;
      for (const learnedId of plan.spellIds) learned.add(learnedId);
      pending.splice(index, 1);
      progressed = true;
    }
    if (!progressed) return "Die importierten Spells erfüllen die Voraussetzungen oder das Spell-Limit nicht.";
  }
  if (learned.size > spellLimit || next.spells.some((spell) => !learned.has(spell))) {
    return "Die importierten Spells überschreiten das Spell-Limit.";
  }
  // Wie beim regulären Erlernen werden nötige Vorstufen gemeinsam verbucht.
  next.spells = [...learned];

  const maximum = technomagePowerPointMaximum(
    level,
    stats.attributes.fitness,
    stats.attributes.presence,
  );
  if (next.powerPointsCurrent !== null && next.powerPointsCurrent > maximum) {
    return `Der importierte PP-Stand überschreitet das aktuelle Maximum von ${maximum}.`;
  }
  const available = effectiveTechnomagePowerPoints(
    previous.powerPointsCurrent,
    previous.powerPointsMaximumAtLastUpdate,
    maximum,
  );
  const requested = next.powerPointsCurrent ?? maximum;
  if (requested > available) {
    return "Der Import kann keine bereits ausgegebenen Power Points zurückerstatten.";
  }
  if (
    (next.powerPointsRecoveryProgress ?? 0) >
    (previous.powerPointsRecoveryProgress ?? 0)
  ) {
    return "Der Import kann den PP-Regenerationsfortschritt nicht erhöhen.";
  }
  if (next.powerPointsCurrent !== null) {
    next.powerPointsMaximumAtLastUpdate = maximum;
  } else {
    next.powerPointsMaximumAtLastUpdate = null;
  }
  return null;
}

export async function importCharacterJsonAction(
  _state: CharacterJsonActionState,
  formData: FormData,
): Promise<CharacterJsonActionState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);
  const characterId = readCharacterId(formData);
  if (!characterId) return { error: "Ungültiger Charakter." };

  const raw = formData.get("characterJson");
  if (typeof raw !== "string") return { error: "Bitte eine JSON-Datei auswählen." };
  const parsed = parseCharacterJsonFile(raw);
  if ("error" in parsed) return { error: parsed.error };

  const [current, currentSheet] = await Promise.all([
    getOwnCharacterForEdit(session.userId, characterId),
    getOwnCharacterStats(session.userId, characterId),
  ]);
  if (!current || !currentSheet || current.npcSlug) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  const imported = parsed.character satisfies CharacterJsonData;
  let stats = imported.stats;
  stats.creationLocked = currentSheet.stats.creationLocked;
  stats.creationMethod = currentSheet.stats.creationMethod;
  stats.pendingAdvancements = currentSheet.stats.pendingAdvancements;
  if (
    currentSheet.stats.creationLocked &&
    currentSheet.stats.creationMethod === "sta2e-lifepath" &&
    [...new Set(imported.species.map(getSpeciesLabel))].sort().join("\u0000") !== [...new Set(current.species.map(getSpeciesLabel))].sort().join("\u0000")
  ) {
    return { error: "Die Spezies ist nach Abschluss der Lifepath-Erstellung gesperrt." };
  }
  if (stats.creationMethod === "sta2e-lifepath") {
    if (currentSheet.stats.creationLocked) {
      stats.lifepath = currentSheet.stats.lifepath;
      stats.characterRole = currentSheet.stats.characterRole;
      stats.speciesAbilities = currentSheet.stats.speciesAbilities;
    }
    stats = applySta2eLifepath(stats, imported.species);
  }
  if (currentSheet.stats.creationLocked) {
    const protectedFields: (keyof CharacterStats)[] = [
      "attributes", "departments", "talents", "focuses",
    ];
    if (protectedFields.some((key) => !sameJson(stats[key], currentSheet.stats[key]))) {
      return {
        error: "Nach Abschluss der Erschaffung lassen sich Attribute, Disziplinen, Talente und Schwerpunkte nicht per JSON ändern.",
      };
    }
    for (const key of protectedFields) {
      (stats as unknown as Record<string, unknown>)[key] = currentSheet.stats[key];
    }
  } else {
    const [rules, talents, focuses] = await Promise.all([
      getAdvancementRules(), listTalents(), listFocuses(),
    ]);
    const error = checkOpenCreationStats(
      stats,
      rules,
      talents.map((talent) => talent.name),
      currentSheet.stats.talents,
      focuses.map((focus) => focus.name),
      currentSheet.stats.focuses,
    );
    if (error) return { error };
  }

  const statErrors = validateCharacterStats(stats);
  if (statErrors.length > 0) return { error: statErrors.join(" ") };

  const [account, modules] = await Promise.all([
    getApAccount(characterId),
    listCampaignRuleModules(),
  ]);
  const technomageError = await validateTechnomageImport(
    stats, currentSheet.stats, modules, account.earned,
  );
  if (technomageError) return { error: technomageError };
  const moduleError = await validateRuleModuleImports(
    stats, currentSheet.stats, modules, account.earned,
  );
  if (moduleError) return { error: moduleError };

  const publicRecordChanged =
    current.name !== imported.name ||
    current.status !== imported.status ||
    current.rank !== imported.rank ||
    !sameJson(current.species, imported.species) ||
    current.homeworld !== imported.homeworld ||
    !sameJson(current.aliases, imported.aliases) ||
    current.age !== imported.age ||
    current.dateOfBirth !== imported.dateOfBirth ||
    !sameJson(current.generation, imported.generation) ||
    !sameJson(current.factions, imported.factions) ||
    !sameJson(current.ships, imported.ships) ||
    current.division !== imported.division ||
    !sameJson(current.tags, imported.tags) ||
    current.sourceMarkdown !== imported.bodyMarkdown;

  const result = await updateOwnCharacterContent(session.userId, characterId, {
    name: imported.name,
    status: imported.status,
    portrait: current.portrait,
    rank: imported.rank,
    species: imported.species,
    homeworld: imported.homeworld,
    aliases: imported.aliases,
    age: imported.age,
    dateOfBirth: imported.dateOfBirth,
    generation: imported.generation,
    factions: imported.factions,
    ships: imported.ships,
    division: imported.division,
    tags: imported.tags,
    bodyMarkdown: imported.bodyMarkdown,
    isDraft: current.isDraft,
    stats,
  });
  if (!result) return { error: "Charakter nicht gefunden oder keine Berechtigung." };

  revalidateCharacter(result.slug);
  await revalidatePathAndNotify(characterEditHref(characterId));
  await revalidatePathAndNotify("/user/characters");
  revalidatePath(`/characters/${result.slug}`);
  syncAutolinksAfterRename({
    type: "character",
    slug: result.slug,
    previousName: result.previousName,
    previousAliases: result.previousAliases ?? [],
    name: imported.name,
    aliases: imported.aliases,
  });

  if (!current.isDraft && publicRecordChanged) {
    const [author, baseUrl] = await Promise.all([
      getUserById(session.userId),
      getBaseUrl(),
    ]);
    await notifyCharacterSubscribers({
      characterSlug: result.slug,
      characterName: imported.name,
      editingUserId: session.userId,
      bioMarkdown: imported.bodyMarkdown || null,
    });
    await notifyContentChange({
      contentType: "character",
      event: "updated",
      authorUserId: session.userId,
      authorName: author?.name ?? "Unbekannt",
      contentTypeLabel: "einen Charakter",
      contentTitle: imported.name,
      contentUrl: `${baseUrl}/characters/${result.slug}`,
      preview: imported.bodyMarkdown
        ? synopsisExcerpt(imported.bodyMarkdown, 140)
        : "Die Akte wurde aktualisiert.",
      notifyPublic: true,
    });
  }

  return { success: "Charakterdaten aus der JSON-Datei importiert." };
}
