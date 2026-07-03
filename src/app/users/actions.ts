"use server";

import { redirect } from "next/navigation";
import { requireGM } from "@/lib/dal";
import {
  EmailTakenError,
  createUser,
  getUserById,
  updateUserRole,
} from "@/lib/users";
import { assignCharacterToUser } from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import { sendActivationEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/http";
import type { User } from "@/types/db";

const ROLES: readonly User["role"][] = ["gm", "player", "viewer"];

function isValidRole(value: string): value is User["role"] {
  return (ROLES as readonly string[]).includes(value);
}

export interface AdminActionState {
  error?: string;
  warning?: string;
  manualActivationUrl?: string;
}

// Jede Action prüft role === "gm" selbst (siehe requireGM in src/lib/dal.ts)
// — nie nur auf ausgeblendete UI verlassen, ein direkter POST muss ebenso
// abgewiesen werden.

export async function createUserAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireGM();

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

export async function updateUserRoleAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const gm = await requireGM();

  const userId = Number(formData.get("userId"));
  const role = String(formData.get("role") ?? "");

  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (!isValidRole(role)) return { error: "Ungültige Rolle." };

  // Aktuell genau ein GM-Account — ohne diese Sperre könnte er sich selbst
  // versehentlich aussperren.
  if (userId === gm.id && role !== "gm") {
    return { error: "Du kannst dir nicht selbst die GM-Rolle entziehen." };
  }

  await updateUserRole(userId, role);
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
    if (!Number.isInteger(userId) || !(await getUserById(userId))) {
      return { error: "Ungültiger User." };
    }
  }

  const character = await assignCharacterToUser(characterId, userId);
  revalidateCharacter(character.slug);

  redirect("/users");
}
