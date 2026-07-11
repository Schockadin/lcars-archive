"use server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { setCharacterVisibilityAdmin } from "@/lib/characters";
import { setMissionLogVisibilityAdmin } from "@/lib/missions";
import { setArchiveEntryVisibilityAdmin } from "@/lib/archive";
import {
  revalidateCharacter,
  revalidateLog,
  revalidateArchiveEntry,
} from "@/lib/revalidate";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/visibility";

// Missionen fehlen bewusst: keine visibility-Spalte (immer öffentlich, siehe
// lib/missions.ts).
export type AdminVisibilityContentType =
  | "character"
  | "mission_log"
  | "archive_entry";

function isValidVisibility(value: string): value is Visibility {
  return (VISIBILITY_OPTIONS as readonly string[]).includes(value);
}

// Admin-only Sichtbarkeits-Verwaltung (AdminVisibilitySelect.tsx, verwendet
// in ActionsMenu.tsx) — anders als setVisibilityAction in
// user/content/actions.ts (nur der Owner selbst) darf hier jeder Admin JEDEN
// Inhalt umstellen, unabhängig vom Owner. Mirrort setOwnerAction in
// src/app/actions/owner.ts (Rolle frisch aus der DB geprüft, nie aus dem
// Session-Cookie; stiller Return statt Redirect, da der Aufruf aus einem
// useTransition-Dropdown kommt).
export async function setVisibilityAdminAction(
  contentType: AdminVisibilityContentType,
  id: number,
  visibility: string,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  if (user?.role !== "admin") return { error: "Nur für Admins." };

  if (!isValidVisibility(visibility)) return { error: "Ungültige Sichtbarkeit." };

  if (contentType === "character") {
    const character = await setCharacterVisibilityAdmin(id, visibility);
    if (!character) return { error: "Charakter nicht gefunden." };
    revalidateCharacter(character.slug);
  } else if (contentType === "mission_log") {
    const log = await setMissionLogVisibilityAdmin(id, visibility);
    if (!log) return { error: "Log nicht gefunden." };
    revalidateLog(log.missionId, log.slug);
  } else {
    const entry = await setArchiveEntryVisibilityAdmin(id, visibility);
    if (!entry) return { error: "Eintrag nicht gefunden." };
    revalidateArchiveEntry(entry.slug);
  }

  return {};
}
