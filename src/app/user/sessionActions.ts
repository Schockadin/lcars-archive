"use server";

import { getCurrentUser } from "@/lib/dal";
import { invalidateOtherSessions } from "@/lib/users";
import { createSession } from "@/lib/session";

export interface LogoutEverywhereState {
  error?: string;
  success?: boolean;
}

// Nutzt dieselbe session_version-Mechanik wie ein Passwortwechsel (siehe
// setPassword in users.ts), aber ohne das Passwort zu ändern: alle anderen
// bereits ausgestellten Session-Cookies werden beim nächsten Request
// verworfen (getCurrentUser in dal.ts). Die eigene, gerade laufende Sitzung
// bleibt aktiv — dafür wird direkt im Anschluss ein frisches Cookie mit der
// neuen session_version ausgestellt, sonst würde sich der nächste eigene
// Request ebenfalls aussperren.
export async function logoutEverywhereAction(
  _state: LogoutEverywhereState,
): Promise<LogoutEverywhereState> {
  const currentUser = await getCurrentUser();
  const newVersion = await invalidateOtherSessions(currentUser.id);
  await createSession({ ...currentUser, session_version: newVersion });
  return { success: true };
}
