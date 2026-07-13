"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import {
  EmailTakenError,
  deleteUser,
  getUserById,
  setUserActive,
  updateUser,
  updateUserRole,
} from "@/lib/users";
import { unassignCharactersFromUser } from "@/lib/characters";
import { getClientIp } from "@/lib/http";
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

export interface EditUserState {
  error?: string;
  success?: boolean;
}

// Eigene Actions statt der in ../../actions.ts (Nutzerverwaltungsliste) —
// gleiche Berechtigungs-/Validierungslogik, aber Redirect zurück auf diese
// Bearbeitungsseite statt auf /users, damit man nach dem Speichern die
// aktualisierten Daten direkt sieht statt zur Liste zu springen. Jede
// Action prüft ihre Berechtigung trotzdem eigenständig (requireAdmin), nie
// nur auf ausgeblendete UI verlassen.

export async function updateUserDetailsAction(
  _state: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  const admin = await requireAdmin();

  const userId = Number(formData.get("userId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "");

  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!email) return { error: "Bitte eine E-Mail-Adresse angeben." };
  if (!isValidRole(role)) return { error: "Ungültige Rolle." };
  if (userId === admin.id && role !== "admin") {
    return { error: "Du kannst dir nicht selbst die Admin-Rolle entziehen." };
  }

  const before = await getUserById(userId);
  if (!before) return { error: "User nicht gefunden." };

  try {
    await updateUser(userId, { name, email });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
    }
    throw err;
  }
  const ip = await getClientIp();
  if (before.name !== name || before.email !== email) {
    await logAdminAction(
      admin.id,
      "update_profile",
      userId,
      `${before.name} <${before.email}> → ${name} <${email}>`,
      ip,
    );
  }

  if (role !== before.role) {
    await updateUserRole(userId, role);
    await logAdminAction(
      admin.id,
      "update_role",
      userId,
      `${name} <${email}>: ${before.role} → ${role}`,
      ip,
    );
    // Gäste dürfen keinen Charakter zugewiesen haben (siehe
    // assignCharacterAction in ../../actions.ts) — bei einer Herabstufung auf
    // "guest" werden bestehende Zuweisungen deshalb aufgelöst, statt einen
    // inkonsistenten Zustand stehen zu lassen.
    if (role === "guest") {
      await unassignCharactersFromUser(userId);
    }
  }

  redirect(`/admin/${userId}/edit`);
}

export async function setUserActiveAction(
  _state: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  const admin = await requireAdmin();

  const userId = Number(formData.get("userId"));
  const active = formData.get("active") === "true";

  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (userId === admin.id && !active) {
    return { error: "Du kannst dich nicht selbst deaktivieren." };
  }

  const target = await getUserById(userId);
  if (!target) return { error: "User nicht gefunden." };

  await setUserActive(userId, active);
  await logAdminAction(
    admin.id,
    active ? "reactivate_user" : "deactivate_user",
    userId,
    `${target.name} <${target.email}>`,
    await getClientIp(),
  );
  redirect(`/admin/${userId}/edit`);
}

export async function deleteUserFromEditAction(
  _state: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  const admin = await requireAdmin();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (userId === admin.id) {
    return { error: "Du kannst dich nicht selbst löschen." };
  }

  const target = await getUserById(userId);
  if (!target) return { error: "User nicht gefunden." };

  // Vor dem Löschen protokollieren (target_user_id verweist zu diesem
  // Zeitpunkt noch auf eine existierende Zeile, siehe FK-Kommentar in
  // scripts/schema.sql) — details hält Name/E-Mail zusätzlich als Klartext
  // fest, da target_user_id danach durch ON DELETE SET NULL auf NULL wechselt.
  await logAdminAction(
    admin.id,
    "delete_user",
    userId,
    `${target.name} <${target.email}>`,
    await getClientIp(),
  );
  await deleteUser(userId);
  redirect("/admin/users");
}
