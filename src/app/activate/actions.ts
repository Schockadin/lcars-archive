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
  // Ein Konto, das nach Ausstellung des Links deaktiviert wurde, darf sich
  // hier kein neues Passwort und keine Sitzung holen — der Login-Weg weist
  // es ebenso ab (siehe login/actions.ts, Fall "inactive"). Ohne diese
  // Prüfung wäre ein noch gültiger Aktivierungs- oder Reset-Link (7 Tage)
  // der Weg zurück an der Deaktivierung vorbei.
  if (!user.is_active) {
    return { error: "Dieses Konto wurde deaktiviert." };
  }

  // setPassword erhöht session_version und gibt den NEUEN Wert zurück. Genau
  // der muss ins frisch ausgestellte Cookie — das oben geladene user-Objekt
  // trägt noch den alten Stand, und ein damit signiertes Cookie würde von
  // getCurrentUser/getActiveSession sofort wieder verworfen: die Person
  // landete unmittelbar nach dem Setzen ihres Passworts erneut auf /login.
  const sessionVersion = await setPassword(user.id, await hashPassword(password));
  await markPasswordSetupTokenUsed(setupToken.id);

  await recordLogin(user.id);
  await createSession({ ...user, session_version: sessionVersion });
  redirect("/");
}
