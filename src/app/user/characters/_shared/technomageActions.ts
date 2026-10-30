"use server";

import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import {
  getOwnCharacterStats,
  updateOwnCharacterTechnomage,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { revalidatePath } from "next/cache";
import { characterEditHref } from "@/lib/contentRoutes";
import {
  TECHNOMAGE_SCHOOLS,
  getTechnomageSpell,
  isTechnomageRole,
} from "@/lib/technomageSpellCatalog";
import { getApAccount } from "@/lib/characterAp";
import {
  calculateTechnomagePowerPointRecovery,
  createSpellPurchasePlan,
  effectiveTechnomagePowerPoints,
  technomageKnownSpellLimit,
  technomageLevelFromAp,
  technomagePowerPointMaximum,
} from "@/lib/technomageSpellRules";
import type { TechnomageSchool } from "@/types/characterStats";

export interface TechnomageActionState {
  error?: string;
  success?: string;
}

function readCharacterId(formData: FormData): number | null {
  const raw = Number(formData.get("characterId"));
  return Number.isInteger(raw) && raw > 0 ? raw : null;
}

function isSchool(value: string): value is TechnomageSchool {
  return TECHNOMAGE_SCHOOLS.some((school) => school.id === value);
}

async function revalidateCharacterSheet(
  characterId: number,
  slug: string,
): Promise<void> {
  revalidateCharacter(slug);
  revalidatePath(characterEditHref(characterId));
  revalidatePath("/user/characters");
}

export async function configureTechnomageSchoolsAction(
  _state: TechnomageActionState,
  formData: FormData,
): Promise<TechnomageActionState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };
  const primaryValue = String(formData.get("primarySchool") ?? "");
  const weakValues = formData.getAll("weakSchool").map(String);
  if (!isSchool(primaryValue)) return { error: "Wähle eine gültige Primärschule." };
  if (
    weakValues.length !== 3 ||
    weakValues.some((school) => !isSchool(school)) ||
    new Set(weakValues).size !== 3 ||
    weakValues.includes(primaryValue)
  ) {
    return {
      error: "Wähle drei verschiedene schwache Schulen, die nicht primär sind.",
    };
  }

  const current = await getOwnCharacterStats(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }
  if (!isTechnomageRole(current.stats.characterRole)) {
    return { error: "Die Schulauswahl ist nur für Techno-Magier verfügbar." };
  }
  const saved = current.stats.technomage;
  if (saved.primarySchool || saved.weakSchools.length > 0 || saved.spells.length > 0) {
    return { error: "Die Schulen wurden bereits festgelegt." };
  }

  const result = await updateOwnCharacterTechnomage(
    session.userId,
    characterId,
    saved,
    {
      ...saved,
      primarySchool: primaryValue,
      weakSchools: weakValues as TechnomageSchool[],
    },
  );
  if (!result) {
    return {
      error: "Die Charakterwerte wurden gerade geändert. Lade die Seite neu.",
    };
  }
  await revalidateCharacterSheet(characterId, result.slug);
  return { success: "Schulen gespeichert." };
}

export async function buyTechnomageSpellAction(
  _state: TechnomageActionState,
  formData: FormData,
): Promise<TechnomageActionState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };
  const spellId = String(formData.get("spellId") ?? "");
  const spell = getTechnomageSpell(spellId);
  if (!spell) return { error: "Dieser Spell ist nicht verfügbar." };

  const current = await getOwnCharacterStats(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }
  if (!isTechnomageRole(current.stats.characterRole)) {
    return { error: "Spells sind nur für Techno-Magier verfügbar." };
  }

  const saved = current.stats.technomage;
  const apAccount = await getApAccount(characterId);
  const level = technomageLevelFromAp(apAccount.earned);
  const plan = createSpellPurchasePlan({
    spellId,
    knownSpellIds: saved.spells,
    knownSpellLimit: technomageKnownSpellLimit(
      level,
      current.stats.attributes.reason,
    ),
    primarySchool: saved.primarySchool,
    weakSchools: saved.weakSchools,
  });
  if (!plan.ok) return { error: plan.error };

  const result = await updateOwnCharacterTechnomage(
    session.userId,
    characterId,
    saved,
    { ...saved, spells: [...saved.spells, ...plan.spellIds] },
  );
  if (!result) {
    return {
      error: "Die Spell-Liste wurde gerade geändert. Lade die Seite neu.",
    };
  }
  await revalidateCharacterSheet(characterId, result.slug);

  const prerequisiteCount = plan.spellIds.length - 1;
  return {
    success:
      spell.name +
      " gelernt" +
      (prerequisiteCount > 0
        ? "; " +
          prerequisiteCount +
          " Voraussetzung" +
          (prerequisiteCount === 1 ? "" : "en") +
          " automatisch gelernt."
        : "."),
  };
}

function readInteger(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export async function updateTechnomagePowerPointsAction(
  _state: TechnomageActionState,
  formData: FormData,
): Promise<TechnomageActionState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };
  const current = await getOwnCharacterStats(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }
  if (!isTechnomageRole(current.stats.characterRole)) {
    return { error: "Power Points sind nur für Techno-Magier verfügbar." };
  }

  const apAccount = await getApAccount(characterId);
  const level = technomageLevelFromAp(apAccount.earned);
  const maximum = technomagePowerPointMaximum(
    level,
    current.stats.attributes.fitness,
    current.stats.attributes.insight,
  );
  const saved = current.stats.technomage;
  const available = effectiveTechnomagePowerPoints(
    saved.powerPointsCurrent,
    saved.powerPointsMaximumAtLastUpdate,
    maximum,
  );
  const operation = String(formData.get("operation") ?? "");
  let nextCurrent: number;
  let nextRecoveryProgress = saved.powerPointsRecoveryProgress;
  let success: string;

  if (operation === "spend") {
    const amount = readInteger(formData, "amount");
    if (amount === null || amount < 1) {
      return { error: "Gib eine positive Anzahl auszugebender PP ein." };
    }
    if (amount > available) {
      return { error: `Es sind nur ${available} PP verfügbar.` };
    }
    nextCurrent = available - amount;
    success = `${amount} PP ausgegeben; ${nextCurrent} / ${maximum} PP übrig.`;
  } else if (operation === "recover") {
    const duration = readInteger(formData, "durationMinutes");
    const maintained = readInteger(formData, "maintainedSpellCount");
    const activity = String(formData.get("activity") ?? "");
    if (
      duration === null || duration < 1 || duration > 10_080 ||
      maintained === null || maintained > saved.spells.length ||
      !["meditation", "light", "strenuous"].includes(activity)
    ) {
      return { error: "Prüfe Dauer, Aktivität und Zahl der aufrechterhaltenen Spells." };
    }
    if (available >= maximum) {
      return { error: "Die PP sind bereits vollständig regeneriert." };
    }
    const recovery = calculateTechnomagePowerPointRecovery({
      current: available,
      maximum,
      durationMinutes: duration,
      activity: activity as "meditation" | "light" | "strenuous",
      maintainedSpellCount: maintained,
      progress: saved.powerPointsRecoveryProgress ?? 0,
    });
    nextCurrent = recovery.current;
    nextRecoveryProgress = recovery.progress;
    success = recovery.recovered > 0
      ? `${recovery.recovered} PP regeneriert; ${nextCurrent} / ${maximum} PP verfügbar.`
      : `Regenerationsfortschritt: ${Math.min(99, Math.round(nextRecoveryProgress * 100))} % des nächsten PP.`;
  } else {
    return { error: "Wähle Ausgeben oder Regenerieren." };
  }

  const result = await updateOwnCharacterTechnomage(
    session.userId,
    characterId,
    saved,
    {
      ...saved,
      powerPointsCurrent: nextCurrent,
      powerPointsMaximumAtLastUpdate: maximum,
      powerPointsRecoveryProgress: nextRecoveryProgress,
    },
  );
  if (!result) {
    return { error: "Die Charakterwerte wurden gerade geändert. Lade die Seite neu." };
  }
  await revalidateCharacterSheet(characterId, result.slug);
  return { success };
}
