"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { updateMissionLogContent } from "@/lib/missions";
import { revalidateLog } from "@/lib/revalidate";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

export interface EditMissionLogState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function updateMissionLogAction(
  _state: EditMissionLogState,
  formData: FormData,
): Promise<EditMissionLogState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const logId = Number(formData.get("logId"));
  if (!Number.isInteger(logId)) {
    return { error: "Ungültiges Log." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      error: `Titel darf höchstens ${MAX_TITLE_LENGTH} Zeichen lang sein.`,
    };
  }

  const logDateRaw = String(formData.get("logDate") ?? "").trim();
  if (logDateRaw && !DATE_RE.test(logDateRaw)) {
    return { error: "Ungültiges Datum." };
  }
  const logDate = logDateRaw || null;

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Log-Text schreiben." };

  const result = await updateMissionLogContent(session.userId, logId, {
    title,
    logDate,
    bodyMarkdown,
  });
  if (!result) {
    return { error: "Log nicht gefunden oder keine Berechtigung." };
  }

  revalidateLog(result.missionId, result.slug);
  redirect(`/users/${session.userId}/content`);
}
