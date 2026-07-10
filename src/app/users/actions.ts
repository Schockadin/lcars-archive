"use server";

import { redirect } from "next/navigation";
import { requireGM, requireAdmin } from "@/lib/dal";
import {
  EmailTakenError,
  createUser,
  getUserById,
  updateUserRole,
  updateUser,
  setUserActive,
  deleteUser,
} from "@/lib/users";
import {
  assignCharacterToUser,
  unassignCharactersFromUser,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import { sendActivationEmail, sendPasswordResetEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/http";
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
  await requireAdmin();

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

  redirect("/users");
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
  await requireAdmin();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };

  const user = await getUserById(userId);
  if (!user) return { error: "User nicht gefunden." };

  const rawToken = await createPasswordSetupToken(user.id);
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

export async function updateUserRoleAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const userId = Number(formData.get("userId"));
  const role = String(formData.get("role") ?? "");

  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (!isValidRole(role)) return { error: "Ungültige Rolle." };

  // Ohne diese Sperre könnte sich ein Admin selbst versehentlich aussperren
  // — unabhängig von der Anzahl anderer Admins, einfachste sichere Regel.
  if (userId === admin.id && role !== "admin") {
    return { error: "Du kannst dir nicht selbst die Admin-Rolle entziehen." };
  }

  await updateUserRole(userId, role);
  // Gäste dürfen keinen Charakter zugewiesen haben (siehe
  // assignCharacterAction unten) — bei einer Herabstufung auf "guest" werden
  // bestehende Zuweisungen deshalb aufgelöst, statt einen inkonsistenten
  // Zustand stehen zu lassen.
  if (role === "guest") {
    await unassignCharactersFromUser(userId);
  }
  redirect("/users");
}

export async function deactivateUserAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (userId === admin.id) {
    return { error: "Du kannst dich nicht selbst deaktivieren." };
  }

  await setUserActive(userId, false);
  redirect("/users");
}

export async function reactivateUserAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };

  await setUserActive(userId, true);
  redirect("/users");
}

export async function deleteUserAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (userId === admin.id) {
    return { error: "Du kannst dich nicht selbst löschen." };
  }

  await deleteUser(userId);
  redirect("/users");
}

export async function updateUserProfileAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const userId = Number(formData.get("userId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!email) return { error: "Bitte eine E-Mail-Adresse angeben." };

  try {
    await updateUser(userId, { name, email });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
    }
    throw err;
  }

  redirect("/users");
}

export async function assignCharacterAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireGM();

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
    if (targetUser.role === "guest") {
      return {
        error: "Gast-Accounts können keine Charaktere zugewiesen bekommen.",
      };
    }
  }

  const character = await assignCharacterToUser(characterId, userId);
  revalidateCharacter(character.slug);

  redirect("/users");
}
