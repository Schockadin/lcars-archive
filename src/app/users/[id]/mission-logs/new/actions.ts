"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import {
  getAllMissions,
  missionLogSlugExists,
  createMissionLog,
} from "@/lib/missions";
import { revalidateLog } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";

export interface MissionLogFormState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// DB ist Source of Truth (siehe createMissionAction für dasselbe Prinzip) —
// der Log landet direkt in der Datenbank, kein Vault-Commit mehr an dieser
// Stelle. Der Vault-Backup-Export (src/lib/vaultExport.ts) generiert die
// Datei später separat.
export async function createMissionLogAction(
  _state: MissionLogFormState,
  formData: FormData,
): Promise<MissionLogFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const authorCharacterId = Number(formData.get("authorCharacterId"));
  if (!Number.isInteger(authorCharacterId)) {
    return { error: "Bitte einen Charakter auswählen." };
  }

  // Nie den <select>-Werten aus dem Client blind vertrauen — wie
  // createDialogueAction in ../dialogues/new/actions.ts.
  const ownCharacters = await getCharactersForUser(session.userId);
  const authorCharacter = ownCharacters.find((c) => c.id === authorCharacterId);
  if (!authorCharacter) {
    return { error: "Ungültiger Charakter." };
  }

  const missionSlug = String(formData.get("missionSlug") ?? "").trim();
  const missions = await getAllMissions();
  const mission = missions.find((m) => m.slug === missionSlug);
  if (!mission) {
    return { error: "Ungültige Mission." };
  }

  const sessionNr = Number(formData.get("sessionNr"));
  if (!Number.isInteger(sessionNr) || sessionNr < 1) {
    return { error: "Ungültige Session-Nummer." };
  }

  const logDateRaw = String(formData.get("logDate") ?? "").trim();
  if (logDateRaw && !DATE_RE.test(logDateRaw)) {
    return { error: "Ungültiges Datum." };
  }
  const logDate = logDateRaw || null;

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Log-Text schreiben." };

  const slug = `${authorCharacter.slug}-${mission.slug}-${sessionNr}`;

  if (await missionLogSlugExists(slug)) {
    return {
      error:
        "Diese Session-Nummer ist für diesen Charakter und diese Mission bereits vergeben.",
    };
  }

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — kein
  // Selbst-Ausschluss nötig, Mission-Logs sind selbst kein Autolinking-Ziel
  // (siehe getAutolinkTargets in src/lib/autolink.ts).
  let contentHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
    const linked = await autoLinkMarkdown(bodyMarkdown);
    bodyMarkdown = linked.sourceMd;
    contentHtml = linked.html;
  }

  const result = await createMissionLog({
    slug,
    missionId: mission.id,
    authorId: authorCharacter.id,
    title,
    bodyMarkdown,
    contentHtml,
    logDate,
    sessionNr,
    ownerUserId: user.id,
  });

  revalidateLog(mission.id, result.slug);
  redirect(`/users/${session.userId}`);
}
