"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { deleteMission } from "@/lib/missions";
import { revalidateMission, revalidateLog } from "@/lib/revalidate";
import { deleteVaultFile } from "@/lib/githubVault";

export interface EditMissionState {
  error?: string;
}

// Löscht eine Mission inkl. aller Mission-Logs (siehe deleteMission in
// src/lib/missions.ts) — anders als deleteMissionLogAction (Meine Inhalte,
// nur der eigene Log) ist das hier admin/gm-only ohne Owner-Bezug, siehe
// EditMissionForm.tsx ("Gefahrenzone", gleiches Muster wie
// deleteUserFromEditAction in src/app/users/[id]/edit/actions.ts). Die
// Vault-Löschung ist Best-Effort: schlägt sie fehl, bleibt die Mission
// trotzdem aus der DB entfernt, siehe deleteMissionLogAction für die gleiche
// Begründung.
export async function deleteMissionAction(
  _state: EditMissionState,
  formData: FormData,
): Promise<EditMissionState> {
  const session = await verifySession();

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "gm" && user.role !== "admin") {
    redirect(`/users/${session.userId}`);
  }

  const missionId = Number(formData.get("missionId"));
  if (!Number.isInteger(missionId)) {
    return { error: "Ungültige Mission." };
  }

  const deleted = await deleteMission(missionId, session.userId);
  if (!deleted) {
    return { error: "Mission nicht gefunden." };
  }

  revalidateMission(deleted.slug);
  for (const logSlug of deleted.logSlugs) {
    revalidateLog(missionId, logSlug);
  }

  try {
    await deleteVaultFile({
      path: `Missionen/${deleted.slug}/index.md`,
      message: `Mission gelöscht: ${deleted.slug} (via Web-App)`,
    });
    for (const logSlug of deleted.logSlugs) {
      await deleteVaultFile({
        path: `Missionen/${deleted.slug}/${logSlug}.md`,
        message: `Missionslog gelöscht: ${logSlug} (via Web-App, Mission entfernt)`,
      });
    }
  } catch {
    // Best-Effort — verwaiste Vault-Dateien bleiben bis zum nächsten
    // manuellen Aufräumen bestehen, die DB ist ohnehin Source of Truth.
  }

  redirect(`/users/${session.userId}/content`);
}
