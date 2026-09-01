"use server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import { userCan } from "@/lib/permissions";
import { assignCharacterToUser } from "@/lib/characters";
import { setMissionOwner, setMissionLogOwner } from "@/lib/missions";
import { setArchiveEntryOwner } from "@/lib/archive";
import {
  revalidateCharacter,
  revalidateMission,
  revalidateLog,
  revalidateArchiveEntry,
} from "@/lib/revalidate";

export type OwnerContentType =
  | "character"
  | "mission"
  | "mission_log"
  | "archive_entry";

// Owner sehen/ändern auf den vier Inhalts-Detailseiten (OwnerSelect.tsx)
// ist admin-only — anders als die Sichtbarkeits-Änderung (nur der Owner
// selbst) darf hier bewusst jeder Admin JEDEN Inhalt umverteilen. Ausnahme
// "mission": Missionen haben ohnehin kein Einzel-Owner-Bearbeitungsmodell
// (jede Spielleitung darf jede Mission bearbeiten/löschen, siehe
// deleteOwnContentAction), die neue GM-Missionsübersicht (/gm/missions)
// braucht deshalb auch für GM eine funktionierende Owner-Zuweisung —
// character/mission_log/archive_entry bleiben admin-only. Stiller Return
// statt Redirect (Aufruf kommt aus einem useTransition-Dropdown, kein
// Formular) — Rolle frisch aus der DB geprüft, nie aus dem Session-Cookie
// (gleiches Prinzip wie in completeDialogueAction).
export async function setOwnerAction(
  contentType: OwnerContentType,
  id: number,
  ownerId: number | null,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  const roleMap = await getRoleMap();
  const allowed =
    !!user &&
    (userCan(user, "content.moderate", roleMap) ||
      (userCan(user, "missions.manage", roleMap) && contentType === "mission"));
  if (!allowed) return { error: "Nur für Admins." };

  if (ownerId != null && !(await getUserById(ownerId))) {
    return { error: "Ungültiger User." };
  }

  if (contentType === "character") {
    const character = await assignCharacterToUser(id, ownerId);
    if (!character) return { error: "Charakter nicht gefunden." };
    revalidateCharacter(character.slug);
  } else if (contentType === "mission") {
    const mission = await setMissionOwner(id, ownerId);
    if (!mission) return { error: "Mission nicht gefunden." };
    revalidateMission(mission.slug);
  } else if (contentType === "mission_log") {
    const log = await setMissionLogOwner(id, ownerId);
    if (!log) return { error: "Log nicht gefunden." };
    revalidateLog(log.missionId, log.slug);
  } else {
    const entry = await setArchiveEntryOwner(id, ownerId);
    if (!entry) return { error: "Eintrag nicht gefunden." };
    revalidateArchiveEntry(entry.slug);
  }

  return {};
}
