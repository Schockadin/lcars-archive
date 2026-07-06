"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { getUserCredentialsByEmail, recordLogin } from "@/lib/users";
import { verifyPassword } from "@/lib/password";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import { sendActivationEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/http";

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

  const user = await getUserCredentialsByEmail(email);

  if (!user) {
    return { error: "Keine Anmeldung für diese E-Mail-Adresse gefunden." };
  }

  if (!user.is_active) {
    return { error: "Dieses Konto wurde deaktiviert." };
  }

  if (!user.password_hash) {
    // Passwort ist Pflicht — weder ein frisch vom Admin angelegtes Konto
    // (requires_activation) noch ein Alt-Konto (vor der Passwort-Einführung)
    // darf sich mehr per E-Mail allein einloggen. Statt eines toten Endes
    // wird bei jedem Versuch ein frischer Aktivierungslink verschickt —
    // derselbe Mechanismus wie beim Anlegen neuer User (createUserAction).
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

  if (!password || !(await verifyPassword(password, user.password_hash))) {
    return { error: "E-Mail-Adresse oder Passwort ist falsch." };
  }

  await recordLogin(user.id);
  await createSession(user);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
