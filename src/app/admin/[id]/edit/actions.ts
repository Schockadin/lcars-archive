"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/dal";
import {
  EmailTakenError,
  deleteUser,
  getUserById,
  setUserActive,
  updateUser,
  updateUserRoles,
  updateUserPermissionOverrides,
} from "@/lib/users";
import { unassignCharactersFromUser } from "@/lib/characters";
import { getClientIp } from "@/lib/http";
import { logAdminAction } from "@/lib/auditLog";
import {
  ALL_ROLES,
  PERMISSIONS,
  rolePermissions,
  userCan,
  type Role,
  type Permission,
  type PermissionOverrides,
} from "@/lib/permissions";

function isValidRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
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
  const admin = await requirePermission("users.manage");

  const userId = Number(formData.get("userId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "");
  // Zusatzrollen (Mehrfachauswahl) — die Primärrolle wird beim Speichern
  // ohnehin ausgefiltert (siehe updateUserRoles).
  const additionalRoles = formData
    .getAll("additionalRoles")
    .map(String)
    .filter(isValidRole);

  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!email) return { error: "Bitte eine E-Mail-Adresse angeben." };
  if (!isValidRole(role)) return { error: "Ungültige Rolle." };

  const effectiveRoles = Array.from(new Set<Role>([role, ...additionalRoles]));
  // Selbstschutz: die eigene Admin-Berechtigung darf man sich nicht entziehen
  // (sonst sperrt man sich selbst aus). Geprüft an den effektiven Rollen.
  if (userId === admin.id && !effectiveRoles.includes("admin")) {
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

  const beforeRoles = Array.from(
    new Set<Role>([before.role, ...before.additional_roles]),
  );
  const rolesChanged =
    beforeRoles.slice().sort().join(",") !==
    effectiveRoles.slice().sort().join(",");
  if (rolesChanged) {
    const updated = await updateUserRoles(userId, role, additionalRoles);
    await logAdminAction(
      admin.id,
      "update_roles",
      userId,
      `${name} <${email}>: [${beforeRoles.join(", ")}] → [${effectiveRoles.join(", ")}]`,
      ip,
    );
    // Wer (nach Rollen + Overrides) keinen Charakter mehr zugewiesen bekommen
    // darf (characters.assignable), verliert bestehende Zuweisungen — statt
    // einen inkonsistenten Zustand stehen zu lassen (früher: Herabstufung auf
    // "guest").
    if (!userCan(updated, "characters.assignable")) {
      await unassignCharactersFromUser(userId);
    }
  }

  redirect(`/admin/${userId}/edit`);
}

// Speichert die individuellen Rechte-Overrides eines Users. Das Formular
// schickt pro Recht den GEWÜNSCHTEN effektiven Zustand (Checkbox an/aus);
// gespeichert wird nur die Abweichung vom Rollen-Default (grant/deny), damit
// eine spätere Rollenänderung geerbte Rechte weiterhin automatisch mitzieht.
export async function updateUserPermissionsAction(
  _state: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  const admin = await requirePermission("users.manage");

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId)) return { error: "Ungültiger User." };

  const target = await getUserById(userId);
  if (!target) return { error: "User nicht gefunden." };

  const roles = Array.from(
    new Set<Role>([target.role, ...target.additional_roles]),
  );
  const roleDefaults = rolePermissions(roles);
  const desired = new Set(
    formData.getAll("permissions").map(String),
  );

  const overrides: PermissionOverrides = {};
  for (const perm of PERMISSIONS as readonly Permission[]) {
    const want = desired.has(perm);
    const inherited = roleDefaults.has(perm);
    if (want !== inherited) overrides[perm] = want;
  }

  await updateUserPermissionOverrides(userId, overrides);
  await logAdminAction(
    admin.id,
    "update_permissions",
    userId,
    `${target.name} <${target.email}>: ${
      Object.keys(overrides).length === 0
        ? "keine Overrides"
        : Object.entries(overrides)
            .map(([k, v]) => `${v ? "+" : "−"}${k}`)
            .join(", ")
    }`,
    await getClientIp(),
  );

  redirect(`/admin/${userId}/edit`);
}

export async function setUserActiveAction(
  _state: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  const admin = await requirePermission("users.manage");

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
  const admin = await requirePermission("users.manage");

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
