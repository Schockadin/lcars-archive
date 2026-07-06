"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";
import { getUserById, recordLogin, setPassword } from "@/lib/users";
import { hashPassword, validatePassword } from "@/lib/password";
import {
  markPasswordSetupTokenUsed,
  peekPasswordSetupToken,
} from "@/lib/passwordSetupTokens";

export interface ActivateState {
  error?: string;
}

export async function activateAccount(
  _state: ActivateState,
  formData: FormData,
): Promise<ActivateState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Token wird hier erneut geprüft statt der Prüfung auf der Seite zu
  // vertrauen — der Link könnte zwischen Seitenaufruf und Absenden bereits
  // in einem anderen Tab verbraucht worden sein.
  const setupToken = await peekPasswordSetupToken(token);
  if (!setupToken) {
    return { error: "Dieser Link ist ungültig oder abgelaufen." };
  }

  if (password !== confirmPassword) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const user = await getUserById(setupToken.userId);
  if (!user) {
    return { error: "Dieses Konto existiert nicht mehr." };
  }

  await setPassword(user.id, await hashPassword(password));
  await markPasswordSetupTokenUsed(setupToken.id);

  await recordLogin(user.id);
  await createSession(user);
  redirect("/");
}
