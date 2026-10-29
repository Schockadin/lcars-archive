import type { TechnomageSlotProgress } from "@/types/characterStats";
import {
  DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
  type TechnomageSpellSlotRules,
} from "@/lib/technomageSpellSlotRules";

function reasonValue(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 7 && value <= 12
    ? value
    : 7;
}

function roundedMilestoneSlots(
  baseSlots: number,
  reason: number,
  rules: TechnomageSpellSlotRules,
): number {
  return Math.max(
    0,
    Math.ceil(
      baseSlots + (reason - rules.reasonBaseline) * rules.reasonModifier,
    ),
  );
}

export function technomageSpellSlotTotal(
  progress: TechnomageSlotProgress,
  currentReason: number | null,
  earnedAp: number = 0,
  rules: TechnomageSpellSlotRules = DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
): number {
  const fallbackReason = reasonValue(currentReason);
  const creationReason = reasonValue(progress.creationReason ?? fallbackReason);
  let total = roundedMilestoneSlots(
    rules.creationBaseSlots + rules.creationBonusSlots,
    creationReason,
    rules,
  );

  if (progress.organellesReason !== null) {
    total += roundedMilestoneSlots(
      rules.organellesBonusSlots,
      reasonValue(progress.organellesReason),
      rules,
    );
  }
  if (progress.ftlAttunementReason !== null) {
    total += roundedMilestoneSlots(
      rules.ftlAttunementBonusSlots,
      reasonValue(progress.ftlAttunementReason),
      rules,
    );
  }

  const milestoneCount =
    Math.floor(Math.max(0, earnedAp) / rules.apThreshold);
  for (let index = 0; index < milestoneCount; index++) {
    const reason = progress.apMilestones[index] ?? fallbackReason;
    total += roundedMilestoneSlots(
      rules.apBonusSlots,
      reasonValue(reason),
      rules,
    );
  }
  return total;
}

// Wird direkt vor einer Verstand-Steigerung aufgerufen: alle bis dahin
// erreichten AP-Schwellen erhalten den damaligen (alten) Verstand-Wert.
export function snapshotTechnomageApSlotReasons(
  progress: TechnomageSlotProgress,
  earnedAp: number,
  reasonAtMilestone: number | null,
  apThreshold: number = DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES.apThreshold,
): TechnomageSlotProgress {
  const threshold = Number.isFinite(apThreshold) && apThreshold > 0
    ? apThreshold
    : DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES.apThreshold;
  const milestoneCount = Math.floor(Math.max(0, earnedAp) / threshold);
  const apMilestones = [...progress.apMilestones];
  const snapshotReason = reasonValue(reasonAtMilestone);
  while (apMilestones.length < milestoneCount) {
    apMilestones.push(snapshotReason);
  }
  return { ...progress, apMilestones };
}
