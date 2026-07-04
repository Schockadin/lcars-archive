"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { updateMissionContent } from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";

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
  redirect(`/users/${session.userId}/content`);
}
