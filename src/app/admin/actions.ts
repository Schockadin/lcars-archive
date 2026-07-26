"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/dal";
import { userCan } from "@/lib/permissions";
import {
  EmailTakenError,
  createUser,
  getUserById,
  invalidateOtherSessions,
} from "@/lib/users";
import { assignCharacterToUser } from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import { sendActivationEmail, sendPasswordResetEmail } from "@/lib/mail";
import { getBaseUrl, getClientIp } from "@/lib/http";
import { logAdminAction } from "@/lib/auditLog";
import type { User } from "@/types/db";

const ROLES: readonly User["role"][] = [
  "admin",
  "gm",
  "player",
  "viewer",
  "guest",
];

function isValidRole(value: string): value is User["role"] {
  return (ROLES as readonly string[]).includes(value);
}

export interface AdminActionState {
  error?: string;
  warning?: string;
  manualActivationUrl?: string;
  // Nur von resetUserPasswordAction gesetzt — zeigt eine Erfolgsmeldung
  // inline in der Zeile statt (wie die übrigen Actions hier) auf /users
  // umzuleiten, was den Erfolg gar nicht sichtbar machen würde.
  sent?: boolean;
  // Nur von forceLogoutUserAction gesetzt — gleiches Prinzip wie sent oben.
  loggedOut?: boolean;
}

// Jede Action prüft ihre Berechtigung selbst (requireGM = gm-oder-admin,
// requireAdmin = nur admin, siehe src/lib/dal.ts) — nie nur auf
// ausgeblendete UI verlassen, ein direkter POST muss ebenso abgewiesen
// werden. Useraccount-Verwaltung (anlegen/Rolle ändern/deaktivieren/
// löschen/bearbeiten) ist admin-only; nur die Charakter-Zuweisung bleibt
// für gm UND admin.

export async function createUserAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requirePermission("users.manage");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!email) return { error: "Bitte eine E-Mail-Adresse angeben." };
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!isValidRole(role)) return { error: "Ungültige Rolle." };

  let newUser;
  try {
    newUser = await createUser({ email, name, role });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
    }
    throw err;
  }
  await logAdminAction(
    admin.id,
    "create_user",
    newUser.id,
    `${newUser.name} <${newUser.email}>, Rolle: ${role}`,
    await getClientIp(),
  );

  const rawToken = await createPasswordSetupToken(newUser.id);
  const activationUrl = `${await getBaseUrl()}/activate?token=${rawToken}`;

  const result = await sendActivationEmail({
    to: newUser.email,
    name: newUser.name,
    activationUrl,
  });

  if (!result.sent) {
    // User ist trotzdem angelegt — der GM kann den Link manuell
    // weitergeben, statt dass die ganze Aktion fehlschlägt (z.B. wenn
    // RESEND_API_KEY noch fehlt).
    return {
      warning: `User angelegt, aber die Aktivierungs-Mail konnte nicht gesendet werden (${result.error}). Link manuell weitergeben:`,
      manualActivationUrl: activationUrl,
    };
  }

  redirect("/admin/users");
}

// Löst denselben Reset-Link aus wie die Selbstbedienung unter
// /forgot-password (createPasswordSetupToken + sendPasswordResetEmail) —
// der Admin setzt dabei nie selbst ein Passwort und erfährt es auch nicht,
// er stößt nur den Mailversand an den Owner an. Bewusst kein direktes
// Setzen eines Passworts durch den Admin (siehe Kommentar bei
// sendPasswordResetEmail in mailCore.ts: Schutz vor Account-Übernahme durch
// einen kompromittierten Admin-Account).
export async function resetUserPasswordAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requirePermission("users.manage");

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };

  const user = await getUserById(userId);
  if (!user) return { error: "User nicht gefunden." };

  // Erst NACH dem erfolgreichen Anlegen des Tokens protokollieren (anders
  // als z.B. bei deleteUserAction, wo die Reihenfolge durch den FK auf
  // target_user_id erzwungen ist) — sonst stünde bei einem Fehler in
  // createPasswordSetupToken ein Log-Eintrag für eine Aktion, die nie
  // durchgeführt wurde.
  const rawToken = await createPasswordSetupToken(user.id);
  await logAdminAction(
    admin.id,
    "reset_password",
    user.id,
    `${user.name} <${user.email}>`,
    await getClientIp(),
  );
  const resetUrl = `${await getBaseUrl()}/activate?token=${rawToken}`;

  const result = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  if (!result.sent) {
    return {
      warning: `Reset-Mail konnte nicht gesendet werden (${result.error}). Link manuell weitergeben:`,
      manualActivationUrl: resetUrl,
    };
  }

  return { sent: true };
}

// Meldet einen fremden User auf ALLEN Geräten ab (erhöht session_version,
// siehe invalidateOtherSessions in users.ts) — für den Verdacht auf ein
// kompromittiertes oder unbeaufsichtigtes Konto, ohne dafür erst ein
// Passwort zurücksetzen zu müssen. Anders als das Self-Service-Pendant in
// src/app/user/sessionActions.ts wird hier kein frisches Cookie
// ausgestellt (der Admin meldet ja nicht sich selbst ab) — der betroffene
// User braucht sich beim nächsten Request einfach neu einzuloggen.
export async function forceLogoutUserAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requirePermission("users.manage");

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (userId === admin.id) {
    return {
      error:
        "Nutze dafür deine eigenen Profil-Einstellungen (\"Auf allen anderen Geräten abmelden\").",
    };
  }

  const user = await getUserById(userId);
  if (!user) return { error: "User nicht gefunden." };

  await invalidateOtherSessions(userId);
  await logAdminAction(
    admin.id,
    "force_logout",
    userId,
    `${user.name} <${user.email}>`,
    await getClientIp(),
  );

  return { loggedOut: true };
}

// Rollenwechsel/Profil bearbeiten/(De-)Aktivieren/Löschen laufen über
// src/app/admin/[id]/edit/actions.ts (die einzige erreichbare UI dafür,
// siehe /admin/[id]/edit) — hier bewusst nicht dupliziert.

export async function assignCharacterAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requirePermission("characters.assign");

  const characterId = Number(formData.get("characterId"));
  const userIdRaw = String(formData.get("userId") ?? "");

  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  let userId: number | null = null;
  if (userIdRaw) {
    userId = Number(userIdRaw);
    const targetUser = Number.isInteger(userId)
      ? await getUserById(userId)
      : null;
    if (!targetUser) {
      return { error: "Ungültiger User." };
    }
    // Gäste dürfen keinen Charakter zugewiesen bekommen (siehe
    // scripts/schema.sql-Kommentar zur Gast-Rolle) — die Auswahl blendet sie
    // zwar bereits aus (siehe page.tsx), ein direkter POST muss aber ebenso
    // abgewiesen werden.
    if (!userCan(targetUser, "characters.assignable")) {
      return {
        error: "Gast-Accounts können keine Charaktere zugewiesen bekommen.",
      };
    }
  }

  const character = await assignCharacterToUser(characterId, userId);
  if (!character) {
    return { error: "Charakter nicht gefunden." };
  }
  revalidateCharacter(character.slug);

  redirect("/admin/characters");
}
