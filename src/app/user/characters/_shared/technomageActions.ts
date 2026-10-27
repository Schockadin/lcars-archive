"use server";

import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import {
  getOwnCharacterStats,
  updateOwnCharacterTechnomage,
} from "@/lib/characters";
import { getApAccount } from "@/lib/characterAp";
import { revalidateCharacter } from "@/lib/revalidate";
import { revalidatePath } from "next/cache";
import { characterEditHref } from "@/lib/contentRoutes";
import {
  TECHNOMAGE_SCHOOLS,
  getTechnomageSpell,
  isTechnomageRole,
  technomageSpellSlotTotal,
} from "@/lib/technomageSpellCatalog";
import { createSpellPurchasePlan } from "@/lib/technomageSpellRules";
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

  const creationReason =
    saved.slotProgress.creationReason ??
    (current.stats.creationLocked
      ? current.stats.attributes.reason ?? 7
      : null);
  const result = await updateOwnCharacterTechnomage(
    session.userId,
    characterId,
    saved,
    {
      ...saved,
      primarySchool: primaryValue,
      weakSchools: weakValues as TechnomageSchool[],
      slotProgress: { ...saved.slotProgress, creationReason },
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

export async function markTechnomageSlotMilestoneAction(
  _state: TechnomageActionState,
  formData: FormData,
): Promise<TechnomageActionState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };
  const milestone = String(formData.get("milestone") ?? "");
  if (milestone !== "organelles" && milestone !== "ftlAttunement") {
    return { error: "Unbekannter Spellslot-Meilenstein." };
  }

  const current = await getOwnCharacterStats(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }
  if (!isTechnomageRole(current.stats.characterRole)) {
    return { error: "Meilensteine sind nur für Techno-Magier verfügbar." };
  }

  const saved = current.stats.technomage;
  const reasonKey = milestone === "organelles" ? "organellesReason" : "ftlAttunementReason";
  if (saved.slotProgress[reasonKey] !== null) {
    return { error: "Dieser Meilenstein wurde bereits erfasst." };
  }
  const label = milestone === "organelles" ? "Organellen" : "FTL-Attunement";
  const reason = current.stats.attributes.reason ?? 7;
  const creationReason =
    saved.slotProgress.creationReason ??
    (current.stats.creationLocked ? reason : null);
  const result = await updateOwnCharacterTechnomage(
    session.userId,
    characterId,
    saved,
    {
      ...saved,
      slotProgress: {
        ...saved.slotProgress,
        creationReason,
        [reasonKey]: reason,
      },
    },
  );
  if (!result) {
    return {
      error: "Die Charakterwerte wurden gerade geändert. Lade die Seite neu.",
    };
  }
  await revalidateCharacterSheet(characterId, result.slug);
  return { success: label + "-Meilenstein gespeichert (Verstand " + reason + ")." };
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
  const account = await getApAccount(characterId);
  const plan = createSpellPurchasePlan({
    spellId,
    knownSpellIds: saved.spells,
    slotTotal: technomageSpellSlotTotal(
      saved.slotProgress,
      current.stats.attributes.reason,
      account.earned,
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
