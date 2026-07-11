"use server";

import { getCurrentUser } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { EmailTakenError, updateUser } from "@/lib/users";

export interface SettingsState {
  error?: string;
  success?: boolean;
}

export async function updateSettings(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  // Ignoriert bewusst jede :id aus der URL — geändert wird ausschließlich
  // der zur aktuellen Session gehörende User, unabhängig davon, welche
  // Route den Server-Function-Aufruf ausgelöst hat.
  const currentUser = await getCurrentUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!name) {
    return { error: "Bitte einen Namen angeben." };
  }
  if (!email) {
    return { error: "Bitte eine E-Mail-Adresse angeben." };
  }

  let updated;
  try {
    updated = await updateUser(currentUser.id, { name, email });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
    }
    throw err;
  }

  // Das Session-Cookie enthält die E-Mail — nach einer Änderung neu
  // ausstellen, sonst zeigt sie bis zum nächsten Login noch die alte an.
  await createSession(updated);

  return { success: true };
}
