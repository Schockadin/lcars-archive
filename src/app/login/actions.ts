"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { getUserCredentialsByEmail, recordLogin } from "@/lib/users";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/password";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import { sendActivationEmail } from "@/lib/mail";
import { getBaseUrl, getClientIp } from "@/lib/http";
import {
  isLoginLocked,
  recordLoginAttempt,
  withEmailLoginLock,
} from "@/lib/loginAttempts";
import type { UserCredentials } from "@/lib/users";

export interface LoginState {
  error?: string;
}

type LoginOutcome =
  | { kind: "locked" }
  | { kind: "inactive" }
  | { kind: "needs-activation"; user: UserCredentials }
  | { kind: "invalid" }
  | { kind: "success"; user: UserCredentials };

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

  // Prüfung, Passwortvergleich und Protokollierung laufen komplett
  // innerhalb von withEmailLoginLock (siehe loginAttempts.ts) — ein pro
  // E-Mail-Adresse gehaltener Advisory-Lock schließt die TOCTOU-Lücke
  // zwischen isLoginLocked (SELECT) und recordLoginAttempt (INSERT), die
  // sonst mehrere parallele Anfragen gemeinsam ausnutzen könnten. redirect()
  // darf hier NICHT aufgerufen werden (der Throw würde die Transaktion
  // zurückrollen) — deshalb liefert der Lock-Block nur ein Outcome, und der
  // eigentliche Redirect/die Mail passieren erst danach, außerhalb der Tx.
  const outcome = await withEmailLoginLock<LoginOutcome>(email, async (tx) => {
    if (await isLoginLocked(email, ip, tx)) {
      return { kind: "locked" };
    }

    const user = await getUserCredentialsByEmail(email, tx);

    // is_active/password_hash-Sonderfälle unten liefern absichtlich einen
    // anderen Text als "E-Mail-Adresse oder Passwort ist falsch" (hilfreich
    // für echte Nutzer dieser Accounts) — das verrät für sich genommen
    // bereits, dass die Adresse registriert ist. Damit wenigstens die
    // Antwortzeit dabei nicht zusätzlich verrät, ob überhaupt ein Account
    // existiert, wird verifyPassword() auch hier durchlaufen und das
    // Ergebnis verworfen — gleicher scrypt-Aufwand wie im Haupt-Login-Pfad
    // unten.
    if (user && !user.is_active) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      await recordLoginAttempt(email, ip, false, tx);
      return { kind: "inactive" };
    }

    if (user && !user.password_hash) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      await recordLoginAttempt(email, ip, false, tx);
      return { kind: "needs-activation", user };
    }

    // Unabhängig davon, ob user existiert: verifyPassword läuft in JEDEM
    // Fall (gegen DUMMY_PASSWORD_HASH, falls nicht) und beide Fälle liefern
    // dieselbe Fehlermeldung — sonst würden Antwortzeit oder Meldungstext
    // verraten, ob eine E-Mail-Adresse registriert ist (anders als bei
    // /forgot-password bewusst in Kauf genommen, siehe Kommentar dort — hier
    // gibt es aber keinen Grund mehr, die beiden Fälle noch zu
    // unterscheiden).
    const passwordValid = await verifyPassword(
      password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordValid) {
      await recordLoginAttempt(email, ip, false, tx);
      return { kind: "invalid" };
    }

    await recordLoginAttempt(email, ip, true, tx);
    return { kind: "success", user };
  });

  switch (outcome.kind) {
    case "locked":
      return {
        error: "Zu viele Anmeldeversuche. Bitte versuche es in ein paar Minuten erneut.",
      };
    case "inactive":
      return { error: "Dieses Konto wurde deaktiviert." };
    case "needs-activation": {
      // Passwort ist Pflicht — weder ein frisch vom Admin angelegtes Konto
      // (requires_activation) noch ein Alt-Konto (vor der Passwort-
      // Einführung) darf sich mehr per E-Mail allein einloggen. Statt eines
      // toten Endes wird bei jedem Versuch ein frischer Aktivierungslink
      // verschickt — derselbe Mechanismus wie beim Anlegen neuer User
      // (createUserAction).
      const { user } = outcome;
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
    case "invalid":
      return { error: "E-Mail-Adresse oder Passwort ist falsch." };
    case "success":
      await recordLogin(outcome.user.id);
      await createSession(outcome.user);
      redirect("/");
  }
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
