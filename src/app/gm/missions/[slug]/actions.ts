"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  deleteMissionSynopsisBlock,
  updateMissionSynopsisBlock,
} from "@/lib/gameSessions";
import { isIsoDate } from "@/lib/gameSessionFormat";
import { getMissionBySlug } from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";

export interface MissionSummaryBlockActionState {
  error?: string;
  success?: string;
}

export async function updateMissionSummaryBlockAction(
  _state: MissionSummaryBlockActionState,
  formData: FormData,
): Promise<MissionSummaryBlockActionState> {
  await requireGM();
  const missionSlug = String(formData.get("missionSlug") ?? "").trim();
  const id = Number(formData.get("blockId"));
  const ingameDate = String(formData.get("ingameDate") ?? "").trim();
  const body = String(formData.get("bodyMarkdown") ?? "");

  if (!missionSlug || !Number.isSafeInteger(id) || id <= 0) {
    return { error: "Der Summary-Block konnte nicht zugeordnet werden." };
  }
  if (!isIsoDate(ingameDate)) {
    return { error: "Bitte ein gültiges Ingame-Datum angeben." };
  }

  const mission = await getMissionBySlug(missionSlug);
  if (!mission) return { error: "Mission nicht gefunden." };
  const updated = await updateMissionSynopsisBlock({
    id,
    missionId: mission.id,
    ingameDate,
    body,
  });
  if (!updated) return { error: "Summary-Block nicht gefunden." };

  revalidateMission(missionSlug);
  revalidatePath(`/gm/missions/${missionSlug}`);
  return { success: "Summary-Block gespeichert." };
}

export async function deleteMissionSummaryBlockAction(
  _state: MissionSummaryBlockActionState,
  formData: FormData,
): Promise<MissionSummaryBlockActionState> {
  await requireGM();
  const missionSlug = String(formData.get("missionSlug") ?? "").trim();
  const id = Number(formData.get("blockId"));

  if (!missionSlug || !Number.isSafeInteger(id) || id <= 0) {
    return { error: "Der Summary-Block konnte nicht zugeordnet werden." };
  }

  const mission = await getMissionBySlug(missionSlug);
  if (!mission) return { error: "Mission nicht gefunden." };
  const deleted = await deleteMissionSynopsisBlock(id, mission.id);
  if (!deleted) return { error: "Summary-Block nicht gefunden." };

  revalidateMission(missionSlug);
  revalidatePath(`/gm/missions/${missionSlug}`);
  return { success: "Summary-Block gelöscht." };
}
