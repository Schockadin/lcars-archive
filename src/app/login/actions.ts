"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { getUserCredentialsByEmail, recordLogin } from "@/lib/users";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/password";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import { sendActivationEmail } from "@/lib/mail";
import { getBaseUrl, getClientIp } from "@/lib/http";
import { isLoginLocked, recordLoginAttempt } from "@/lib/loginAttempts";

export interface LoginState {
  error?: string;
}

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "Bitte eine E-Mail-Adresse eingeben." };
  }

  const ip = await getClientIp();
  if (await isLoginLocked(email, ip)) {
    return {
      error: "Zu viele Anmeldeversuche. Bitte versuche es in ein paar Minuten erneut.",
    };
  }

  const user = await getUserCredentialsByEmail(email);

  if (user && !user.is_active) {
    await recordLoginAttempt(email, ip, false);
    return { error: "Dieses Konto wurde deaktiviert." };
  }

  if (user && !user.password_hash) {
    // Passwort ist Pflicht — weder ein frisch vom Admin angelegtes Konto
    // (requires_activation) noch ein Alt-Konto (vor der Passwort-Einführung)
    // darf sich mehr per E-Mail allein einloggen. Statt eines toten Endes
    // wird bei jedem Versuch ein frischer Aktivierungslink verschickt —
    // derselbe Mechanismus wie beim Anlegen neuer User (createUserAction).
    await recordLoginAttempt(email, ip, false);
    const rawToken = await createPasswordSetupToken(user.id);
    const activationUrl = `${await getBaseUrl()}/activate?token=${rawToken}`;
    const result = await sendActivationEmail({
      to: user.email,
      name: user.name,
      activationUrl,
    });

    return {
      error: result.sent
        ? "Für dieses Konto ist noch kein Passwort gesetzt. Wir haben dir einen Link zum Festlegen geschickt."
        : "Für dieses Konto ist noch kein Passwort gesetzt, und die Mail konnte nicht gesendet werden. Bitte wende dich an die Spielleitung.",
    };
  }

  // Unabhängig davon, ob user existiert: verifyPassword läuft in JEDEM Fall
  // (gegen DUMMY_PASSWORD_HASH, falls nicht) und beide Fälle liefern dieselbe
  // Fehlermeldung — sonst würden Antwortzeit oder Meldungstext verraten, ob
  // eine E-Mail-Adresse registriert ist (anders als bei /forgot-password
  // bewusst in Kauf genommen, siehe Kommentar dort — hier gibt es aber
  // keinen Grund mehr, die beiden Fälle noch zu unterscheiden).
  const passwordValid = await verifyPassword(
    password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !passwordValid) {
    await recordLoginAttempt(email, ip, false);
    return { error: "E-Mail-Adresse oder Passwort ist falsch." };
  }

  await recordLoginAttempt(email, ip, true);
  await recordLogin(user.id);
  await createSession(user);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
