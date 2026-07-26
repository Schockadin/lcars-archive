"use server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { userCan } from "@/lib/permissions";
import {
  updateMissionSynopsis,
  updateMissionSynopsisWithHtml,
  getMissionById,
  notifyMissionSubscribers,
} from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import { synopsisExcerpt } from "@/lib/missionFormat";

export interface MissionSynopsisEditState {
  error?: string;
  success?: boolean;
  updatedHtml?: string;
}

// Inline-Bearbeitung der Synopsis direkt auf /missions/[slug]
// (MissionSynopsisEditor) — schlanker als das volle Mission-Formular unter
// /user/missions/[missionId]/edit: nur der Fließtext ändert sich,
// Titel/Status/Zeitraum/Tags bleiben unangetastet. Admin/GM-only, Rolle
// frisch aus der DB geprüft (wie setOwnerAction in actions/owner.ts).
export async function updateMissionSynopsisAction(
  _state: MissionSynopsisEditState,
  formData: FormData,
): Promise<MissionSynopsisEditState> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  if (!user || !userCan(user, "missions.manage")) {
    return { error: "Nur für die Spielleitung." };
  }

  const missionId = Number(formData.get("missionId"));
  if (!Number.isInteger(missionId)) {
    return { error: "Ungültige Mission." };
  }

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine Zusammenfassung schreiben." };

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — die Mission
  // selbst muss dabei als Autolinking-Ziel ausgeschlossen werden, dafür
  // wird ihr aktueller Slug vorab geladen. updateMissionSynopsisWithHtml
  // (statt updateMissionSynopsis) übernimmt dabei das schon per
  // autoLinkMarkdown() gerenderte + aufgelöste HTML unverändert, statt es
  // ein zweites Mal (und ohne Wikilink-Auflösung) selbst zu rendern.
  if (formData.get("autoLink") === "on") {
    const mission = await getMissionById(missionId);
    if (!mission) return { error: "Mission nicht gefunden." };

    const linked = await autoLinkMarkdown(bodyMarkdown, {
      type: "mission",
      slug: mission.slug,
    });
    await updateMissionSynopsisWithHtml(
      missionId,
      linked.sourceMd,
      linked.html,
    );
    revalidateMission(mission.slug);
    await notifyMissionSubscribers({
      missionSlug: mission.slug,
      missionTitle: mission.title,
      editingUserId: session.userId,
      preview: synopsisExcerpt(linked.sourceMd, 140),
    });
    return { success: true, updatedHtml: linked.html };
  }

  const result = await updateMissionSynopsis(missionId, bodyMarkdown);
  if (!result) return { error: "Mission nicht gefunden." };

  revalidateMission(result.slug);
  await notifyMissionSubscribers({
    missionSlug: result.slug,
    missionTitle: result.title,
    editingUserId: session.userId,
    preview: synopsisExcerpt(bodyMarkdown, 140),
  });

  return { success: true, updatedHtml: result.metadata.body ?? undefined };
}
