"use server";
import { redirect } from "next/navigation";
import matter from "gray-matter";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { updateMissionContent } from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";
import { updateVaultFile } from "@/lib/githubVault";

export interface EditMissionState {
  error?: string;
  warning?: string;
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

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine Zusammenfassung schreiben." };

  const result = await updateMissionContent(missionId, {
    title,
    status: status as (typeof VALID_STATUSES)[number],
    startedAt,
    endedAt,
    tags,
    bodyMarkdown,
  });
  if (!result) {
    return { error: "Mission nicht gefunden." };
  }

  revalidateMission(result.slug);

  // Dual-Write wie updateMissionLogAction (mission-logs/[logId]/edit/actions.ts):
  // die DB ist bereits aktuell, der Vault soll es bleiben (Single Source of
  // Truth für einen künftigen Reingest). Best-Effort — schlägt der Vault-Sync
  // fehl, bleibt die Bearbeitung trotzdem gespeichert, aber sichtbar markiert.
  const fileContent = matter.stringify(bodyMarkdown, {
    type: "mission",
    slug: result.slug,
    title,
    status,
    ...(startedAt ? { started_at: startedAt } : {}),
    ...(endedAt ? { ended_at: endedAt } : {}),
    ...(tags.length ? { tags } : {}),
    ...(result.ownerSlug ? { owner: result.ownerSlug } : {}),
  });

  try {
    await updateVaultFile({
      path: `Missionen/${result.slug}/index.md`,
      content: fileContent,
      message: `Mission bearbeitet: ${title} (via Web-App)`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      warning:
        `Änderung gespeichert, aber die Vault-Datei konnte nicht mit ` +
        `aktualisiert werden (${message}). Bei einem künftigen vollen ` +
        `Reingest würde diese Bearbeitung sonst wieder überschrieben werden.`,
    };
  }

  redirect(`/users/${session.userId}/content`);
}
