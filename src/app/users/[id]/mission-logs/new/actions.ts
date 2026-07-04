"use server";
import { redirect } from "next/navigation";
import matter from "gray-matter";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import { getAllMissions, missionLogSlugExists } from "@/lib/missions";
import { commitVaultFile, VaultFileExistsError } from "@/lib/githubVault";

export interface MissionLogVaultState {
  error?: string;
  success?: { commitUrl: string; path: string };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createMissionLogVaultAction(
  _state: MissionLogVaultState,
  formData: FormData,
): Promise<MissionLogVaultState> {
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
  const logDate = logDateRaw || undefined;

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
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

  const fileContent = matter.stringify(bodyMarkdown, {
    type: "mission-log",
    title,
    mission: mission.slug,
    author: authorCharacter.slug,
    session_nr: sessionNr,
    ...(logDate ? { log_date: logDate } : {}),
    owner: user.slug,
  });

  const path = `Missionen/${mission.slug}/${slug}.md`;

  try {
    const { htmlUrl } = await commitVaultFile({
      path,
      content: fileContent,
      message: `Neuer Missionslog: ${title} (via Web-App, ${user.name})`,
    });
    return { success: { commitUrl: htmlUrl, path } };
  } catch (err) {
    if (err instanceof VaultFileExistsError) {
      return {
        error:
          "Diese Datei existiert im Vault bereits (evtl. steht ein Ingest noch aus) — bitte eine andere Session-Nummer wählen.",
      };
    }
    return {
      error:
        err instanceof Error
          ? `Commit ins Vault fehlgeschlagen: ${err.message}`
          : "Commit ins Vault fehlgeschlagen.",
    };
  }
}
