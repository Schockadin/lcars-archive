"use server";

import { getCurrentUser } from "@/lib/dal";
import { getPasswordHash, setPassword } from "@/lib/users";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";

export interface PasswordState {
  error?: string;
  success?: boolean;
}

export async function updatePasswordAction(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  // Wie updateSettings in ./actions.ts: ignoriert jede :id aus der URL,
  // betrifft immer nur den zur aktuellen Session gehörenden User.
  const currentUser = await getCurrentUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return { error: passwordError };
  }

  // Nur verlangen, wenn bereits ein Passwort existiert — beim erstmaligen
  // Festlegen (Bestandskonto ohne Passwort) gibt es nichts zu bestätigen.
  const existingHash = await getPasswordHash(currentUser.id);
  if (existingHash) {
    if (!currentPassword || !(await verifyPassword(currentPassword, existingHash))) {
      return { error: "Aktuelles Passwort ist falsch." };
    }
  }

  await setPassword(currentUser.id, await hashPassword(newPassword));

  return { success: true };
}
