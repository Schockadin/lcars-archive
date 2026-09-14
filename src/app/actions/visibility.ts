"use server";
import { getActiveSession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import { userCan } from "@/lib/permissions";
import { setCharacterDraftAdmin } from "@/lib/characters";
import { setMissionLogDraftAdmin } from "@/lib/missions";
import { setArchiveEntryDraftAdmin } from "@/lib/archive";
import {
  revalidateCharacter,
  revalidateLog,
  revalidateArchiveEntry,
} from "@/lib/revalidate";
import { isContentState } from "@/lib/visibility";

// Missionen fehlen bewusst: Ihr Entwurfs-Zustand hängt am Missions-Editor
// (nur Spielleitung/Administration), nicht an einem Umschalter im
// Aktionen-Panel.
export type AdminVisibilityContentType =
  | "character"
  | "mission_log"
  | "archive_entry";

// Moderation: veröffentlichen oder zurückziehen (AdminContentStateSelect.tsx,
// verwendet in ActionsMenu.tsx) — anders als setContentStateAction in
// user/content/actions.ts (nur der Owner selbst) darf hier jede Person mit
// content.moderate JEDEN Inhalt umstellen, unabhängig vom Owner. Mirrort setOwnerAction in
// src/app/actions/owner.ts (Rolle frisch aus der DB geprüft, nie aus dem
// Session-Cookie; stiller Return statt Redirect, da der Aufruf aus einem
// useTransition-Dropdown kommt).
export async function setContentStateAdminAction(
  contentType: AdminVisibilityContentType,
  id: number,
  state: string,
): Promise<{ error?: string }> {
  const session = await getActiveSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  const roleMap = await getRoleMap();
  if (!user || !userCan(user, "content.moderate", roleMap)) {
    return { error: "Nur für die Moderation." };
  }

  if (!isContentState(state)) return { error: "Ungültiger Zustand." };
  const isDraft = state === "draft";

  if (contentType === "character") {
    const character = await setCharacterDraftAdmin(id, isDraft);
    if (!character) return { error: "Charakter nicht gefunden." };
    revalidateCharacter(character.slug);
  } else if (contentType === "mission_log") {
    const log = await setMissionLogDraftAdmin(id, isDraft);
    if (!log) return { error: "Log nicht gefunden." };
    revalidateLog(log.missionId, log.slug);
  } else {
    const entry = await setArchiveEntryDraftAdmin(id, isDraft);
    if (!entry) return { error: "Eintrag nicht gefunden." };
    revalidateArchiveEntry(entry.slug);
  }

  return {};
}
