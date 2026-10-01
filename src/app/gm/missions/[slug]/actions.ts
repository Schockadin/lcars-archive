"use server";
import { redirect } from "next/navigation";
import { revalidatePathAndNotify } from "@/lib/realtimeServer";
import { requireGM } from "@/lib/dal";
import { deleteMission } from "@/lib/missions";
import { getMissionBySlug } from "@/lib/missions";
import { deleteMissionSynopsisBlock, updateMissionSynopsisBlock } from "@/lib/gameSessions";
import { isIsoDate } from "@/lib/gameSessionFormat";
import { revalidateMission, revalidateLog } from "@/lib/revalidate";

export interface EditMissionState { error?: string; }
export interface MissionSummaryBlockActionState { error?: string; success?: string; }

export async function updateMissionSummaryBlockAction(_state: MissionSummaryBlockActionState, formData: FormData): Promise<MissionSummaryBlockActionState> {
  await requireGM();
  const missionSlug = String(formData.get("missionSlug") ?? "").trim();
  const id = Number(formData.get("blockId"));
  const ingameDate = String(formData.get("ingameDate") ?? "").trim();
  const body = String(formData.get("bodyMarkdown") ?? "");
  if (!missionSlug || !Number.isSafeInteger(id) || id <= 0) return { error: "Der Log-Eintrag konnte nicht zugeordnet werden." };
  if (!isIsoDate(ingameDate)) return { error: "Bitte ein gültiges Ingame-Datum angeben." };
  if (!body.trim() || body.length > 12_000) return { error: "Bitte einen Text mit höchstens 12.000 Zeichen angeben." };
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) return { error: "Mission nicht gefunden." };
  if (!(await updateMissionSynopsisBlock({ id, missionId: mission.id, ingameDate, body }))) return { error: "Log-Eintrag nicht gefunden." };
  revalidateMission(missionSlug);
  await revalidatePathAndNotify(`/gm/missions/${encodeURIComponent(missionSlug)}`);
  return { success: "Log-Eintrag gespeichert." };
}

export async function deleteMissionSummaryBlockAction(_state: MissionSummaryBlockActionState, formData: FormData): Promise<MissionSummaryBlockActionState> {
  await requireGM();
  const missionSlug = String(formData.get("missionSlug") ?? "").trim();
  const id = Number(formData.get("blockId"));
  if (!missionSlug || !Number.isSafeInteger(id) || id <= 0) return { error: "Der Log-Eintrag konnte nicht zugeordnet werden." };
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) return { error: "Mission nicht gefunden." };
  if (!(await deleteMissionSynopsisBlock(id, mission.id))) return { error: "Log-Eintrag nicht gefunden." };
  revalidateMission(missionSlug);
  await revalidatePathAndNotify(`/gm/missions/${encodeURIComponent(missionSlug)}`);
  return { success: "Log-Eintrag gelöscht." };
}

export async function deleteGmMissionAction(_state: EditMissionState, formData: FormData): Promise<EditMissionState> {
  const user = await requireGM();
  const missionId = Number(formData.get("missionId"));
  if (!Number.isInteger(missionId)) return { error: "Ungültige Mission." };
  const deleted = await deleteMission(missionId, user.id);
  if (!deleted) return { error: "Mission nicht gefunden." };
  revalidateMission(deleted.slug);
  for (const slug of deleted.logSlugs) revalidateLog(missionId, slug);
  redirect("/gm/missions");
}
