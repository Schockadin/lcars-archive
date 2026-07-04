"use server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { updateMissionSynopsis } from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";

export interface MissionSynopsisEditState {
  error?: string;
  success?: boolean;
  updatedHtml?: string;
}

// Inline-Bearbeitung der Synopsis direkt auf /missions/[slug]
// (MissionSynopsisEditor) — schlanker als das volle Mission-Formular unter
// /users/[id]/missions/[missionId]/edit: nur der Fließtext ändert sich,
// Titel/Status/Zeitraum/Tags bleiben unangetastet. Admin/GM-only, Rolle
// frisch aus der DB geprüft (wie setOwnerAction in actions/owner.ts).
export async function updateMissionSynopsisAction(
  _state: MissionSynopsisEditState,
  formData: FormData,
): Promise<MissionSynopsisEditState> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  if (!user || (user.role !== "gm" && user.role !== "admin")) {
    return { error: "Nur für die Spielleitung." };
  }

  const missionId = Number(formData.get("missionId"));
  if (!Number.isInteger(missionId)) {
    return { error: "Ungültige Mission." };
  }

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine Zusammenfassung schreiben." };

  const result = await updateMissionSynopsis(missionId, bodyMarkdown);
  if (!result) return { error: "Mission nicht gefunden." };

  revalidateMission(result.slug);

  return { success: true, updatedHtml: result.metadata.body ?? undefined };
}
