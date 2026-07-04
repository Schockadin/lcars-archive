"use server";
import matter from "gray-matter";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { updateMissionSynopsis } from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";
import { updateVaultFile } from "@/lib/githubVault";

export interface MissionSynopsisEditState {
  error?: string;
  warning?: string;
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

  const fileContent = matter.stringify(bodyMarkdown, {
    type: "mission",
    slug: result.slug,
    title: result.title,
    status: result.status,
    ...(result.startedAt ? { started_at: result.startedAt } : {}),
    ...(result.endedAt ? { ended_at: result.endedAt } : {}),
    ...(result.metadata.tags.length ? { tags: result.metadata.tags } : {}),
    ...(result.ownerSlug ? { owner: result.ownerSlug } : {}),
  });

  try {
    await updateVaultFile({
      path: `Missionen/${result.slug}/index.md`,
      content: fileContent,
      message: `Mission-Synopsis bearbeitet: ${result.title} (via Web-App)`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: true,
      updatedHtml: result.metadata.body ?? undefined,
      warning:
        `Gespeichert, aber die Vault-Datei konnte nicht mit aktualisiert ` +
        `werden (${message}). Bei einem künftigen vollen Reingest würde ` +
        `diese Bearbeitung sonst wieder überschrieben werden.`,
    };
  }

  return { success: true, updatedHtml: result.metadata.body ?? undefined };
}
