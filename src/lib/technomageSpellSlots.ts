import type { TechnomageSlotProgress } from "@/types/characterStats";

function reasonValue(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 7 && value <= 12
    ? value
    : 7;
}

function roundedMilestoneSlots(reason: number): number {
  return Math.ceil(2.5 + (reason - 7));
}

export function technomageSpellSlotTotal(
  progress: TechnomageSlotProgress,
  currentReason: number | null,
  earnedAp: number = 0,
): number {
  const fallbackReason = reasonValue(currentReason);
  const creationReason = reasonValue(progress.creationReason ?? fallbackReason);
  let total = Math.ceil(5 + 2.5 + (creationReason - 7));

  if (progress.organellesReason !== null) {
    total += roundedMilestoneSlots(reasonValue(progress.organellesReason));
  }
  if (progress.ftlAttunementReason !== null) {
    total += roundedMilestoneSlots(reasonValue(progress.ftlAttunementReason));
  }

  const milestoneCount = Math.floor(Math.max(0, earnedAp) / 20);
  for (let index = 0; index < milestoneCount; index++) {
    const reason = progress.apMilestones[index] ?? fallbackReason;
    total += roundedMilestoneSlots(reasonValue(reason));
  }
  return total;
}

// Wird direkt vor einer Reason-Steigerung aufgerufen: alle bis dahin
// erreichten AP-Schwellen erhalten den damaligen (alten) Reason-Wert.
export function snapshotTechnomageApSlotReasons(
  progress: TechnomageSlotProgress,
  earnedAp: number,
  reasonAtMilestone: number | null,
): TechnomageSlotProgress {
  const milestoneCount = Math.floor(Math.max(0, earnedAp) / 20);
  const apMilestones = [...progress.apMilestones];
  const snapshotReason = reasonValue(reasonAtMilestone);
  while (apMilestones.length < milestoneCount) {
    apMilestones.push(snapshotReason);
  }
  return { ...progress, apMilestones };
}
