"use server";
import { redirect } from "next/navigation";
import matter from "gray-matter";
import { verifySession } from "@/lib/dal";
import { updateMissionLogContent } from "@/lib/missions";
import { revalidateLog } from "@/lib/revalidate";
import { updateVaultFile } from "@/lib/githubVault";

export interface EditMissionLogState {
  error?: string;
  warning?: string;
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

  // Dual-Write: die DB ist bereits aktuell (siehe oben), der Vault soll es
  // aber bleiben (Single Source of Truth, u.a. für die Timeline-Generierung
  // beim Ingest). Best-Effort wie schon bei deleteMissionLogAction — der
  // konventionelle Pfad stimmt nur für Logs, die selbst über die App
  // committet wurden. Schlägt der Vault-Sync fehl, bleibt die Bearbeitung
  // trotzdem gespeichert, aber wir zeigen das sichtbar an (statt still zu
  // loggen) — sonst merkt niemand, dass ein künftiger voller Reingest diese
  // Bearbeitung wieder überschreiben würde.
  const fileContent = matter.stringify(bodyMarkdown, {
    type: "mission-log",
    title,
    mission: result.missionSlug,
    author: result.authorSlug,
    session_nr: result.sessionNr,
    ...(logDate ? { log_date: logDate } : {}),
    ...(result.ownerSlug ? { owner: result.ownerSlug } : {}),
  });

  try {
    await updateVaultFile({
      path: `Missionen/${result.missionSlug}/${result.slug}.md`,
      content: fileContent,
      message: `Missionslog bearbeitet: ${title} (via Web-App)`,
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
