"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  updateMissionContent,
  deleteMission,
  getMissionById,
} from "@/lib/missions";
import { revalidateMission, revalidateLog } from "@/lib/revalidate";
import { deleteVaultFile } from "@/lib/githubVault";
import { autoLinkMarkdown } from "@/lib/autolink";

export interface EditMissionState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["active", "completed", "failed", "abandoned"] as const;

export async function updateMissionAction(
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

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const status = String(formData.get("status") ?? "");
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Ungültiger Status." };
  }

  const startedAtRaw = String(formData.get("startedAt") ?? "").trim();
  if (startedAtRaw && !DATE_RE.test(startedAtRaw)) {
    return { error: "Ungültiges Startdatum." };
  }
  const startedAt = startedAtRaw || null;

  const endedAtRaw = String(formData.get("endedAt") ?? "").trim();
  if (endedAtRaw && !DATE_RE.test(endedAtRaw)) {
    return { error: "Ungültiges Enddatum." };
  }
  const endedAt = endedAtRaw || null;

  const tags = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine Zusammenfassung schreiben." };

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — die Mission
  // selbst muss dabei als Autolinking-Ziel ausgeschlossen werden (sonst
  // könnte ihr Titel im eigenen Text auf sich selbst verlinken), dafür wird
  // ihr aktueller Slug vorab geladen.
  let bodyHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
    const mission = await getMissionById(missionId);
    const linked = await autoLinkMarkdown(
      bodyMarkdown,
      mission ? { type: "mission", slug: mission.slug } : undefined,
    );
    bodyMarkdown = linked.sourceMd;
    bodyHtml = linked.html;
  }

  const result = await updateMissionContent(missionId, {
    title,
    status: status as (typeof VALID_STATUSES)[number],
    startedAt,
    endedAt,
    tags,
    bodyMarkdown,
    bodyHtml,
  });
  if (!result) {
    return { error: "Mission nicht gefunden." };
  }

  revalidateMission(result.slug);
  redirect(`/users/${session.userId}/content`);
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
