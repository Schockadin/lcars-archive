"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { getClientIp } from "@/lib/http";
import { logAdminAction } from "@/lib/auditLog";
import { slugifyBase } from "@/lib/slug";
import {
  createRole,
  updateRole,
  deleteRole,
  getRoleByKey,
  getRoleMap,
  RoleKeyTakenError,
  RoleInUseError,
  SystemRoleError,
} from "@/lib/roles";
import { listAllUsers, updateUserRoles } from "@/lib/users";
import { unassignCharactersFromUser } from "@/lib/characters";
import {
  PERMISSIONS,
  isSystemRole,
  userCan,
  effectiveRolesOf,
  resolvePermissions,
  type Permission,
} from "@/lib/permissions";

export interface RolesState {
  error?: string;
  success?: boolean;
}

function parsePermissions(formData: FormData): Permission[] {
  const known = new Set(PERMISSIONS as readonly string[]);
  return formData
    .getAll("permissions")
    .map(String)
    .filter((p): p is Permission => known.has(p));
}

// Legt eine eigene Rolle an. Der Schlüssel wird aus dem Namen abgeleitet
// (slugify) und darf nicht mit einer System-Rolle kollidieren.
export async function createRoleAction(
  _state: RolesState,
  formData: FormData,
): Promise<RolesState> {
  const admin = await requirePermission("users.manage");

  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!label) return { error: "Bitte einen Namen für die Rolle angeben." };

  const key = slugifyBase(label);
  if (!key) return { error: "Aus dem Namen lässt sich kein gültiger Schlüssel bilden." };
  if (isSystemRole(key)) {
    return { error: "Dieser Schlüssel ist für eine System-Rolle reserviert." };
  }

  const permissions = parsePermissions(formData);

  try {
    await createRole({ key, label, description, permissions });
  } catch (err) {
    if (err instanceof RoleKeyTakenError) {
      return { error: "Eine Rolle mit diesem Schlüssel existiert bereits." };
    }
    throw err;
  }

  await logAdminAction(
    admin.id,
    "create_role",
    null,
    `${label} (${key}): [${permissions.join(", ")}]`,
    await getClientIp(),
  );
  revalidatePath("/admin/permissions");
  return { success: true };
}

// Bearbeitet Name/Beschreibung/Rechte einer Rolle (auch System-Rollen —
// Schlüssel bleibt unverändert).
export async function updateRoleAction(
  _state: RolesState,
  formData: FormData,
): Promise<RolesState> {
  const admin = await requirePermission("users.manage");

  const key = String(formData.get("key") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!label) return { error: "Bitte einen Namen für die Rolle angeben." };

  const existing = await getRoleByKey(key);
  if (!existing) return { error: "Rolle nicht gefunden." };

  const permissions = parsePermissions(formData);

  // Selbstschutz: hält die bearbeitende Person diese Rolle selbst, darf die
  // Änderung ihr nicht das eigene Admin-Recht entziehen (sonst Aussperrung —
  // z.B. admin.access aus der „admin"-Rolle entfernen). Geprüft an einer
  // hypothetischen Rollen-Map mit den neuen Rechten dieser Rolle.
  const adminRoles = effectiveRolesOf(admin);
  if (adminRoles.includes(key)) {
    const hypotheticalMap = { ...(await getRoleMap()), [key]: permissions };
    const adminPerms = resolvePermissions(
      adminRoles,
      admin.permission_overrides,
      hypotheticalMap,
    );
    if (!adminPerms.has("admin.access")) {
      return {
        error:
          "Diese Änderung würde dir selbst das Admin-Recht entziehen — abgebrochen.",
      };
    }
  }

  await updateRole(key, { label, description, permissions });
  await logAdminAction(
    admin.id,
    "edit_role",
    null,
    `${label} (${key}): [${permissions.join(", ")}]`,
    await getClientIp(),
  );
  revalidatePath("/admin/permissions");
  return { success: true };
}

// Löscht eine eigene Rolle (System-Rollen und noch zugewiesene Rollen werden
// abgelehnt).
export async function deleteRoleAction(
  _state: RolesState,
  formData: FormData,
): Promise<RolesState> {
  const admin = await requirePermission("users.manage");

  const key = String(formData.get("key") ?? "");
  const existing = await getRoleByKey(key);
  if (!existing) return { error: "Rolle nicht gefunden." };

  try {
    await deleteRole(key);
  } catch (err) {
    if (err instanceof SystemRoleError) {
      return { error: "System-Rollen können nicht gelöscht werden." };
    }
    if (err instanceof RoleInUseError) {
      return {
        error:
          "Die Rolle ist noch Usern zugewiesen. Entferne sie zuerst überall, dann kann sie gelöscht werden.",
      };
    }
    throw err;
  }

  await logAdminAction(
    admin.id,
    "delete_role",
    null,
    `${existing.label} (${key})`,
    await getClientIp(),
  );
  revalidatePath("/admin/permissions");
  return { success: true };
}

// Setzt die Mitgliedschaft einer Rolle: Aus den angehakten User-IDs wird für
// jeden betroffenen User die Zusatzrollen-Liste angepasst. Die PRIMÄRrolle wird
// hier NICHT verändert — wer die Rolle als Primärrolle hat, ist immer Mitglied
// (das steuert der User-Editor unter /admin/[id]/edit). Verliert ein User durch
// das Entfernen das Recht, einen Charakter zu führen, werden dessen Zuweisungen
// gelöst (gleiche Invariante wie im User-Editor).
export async function updateRoleMembersAction(
  _state: RolesState,
  formData: FormData,
): Promise<RolesState> {
  const admin = await requirePermission("users.manage");

  const key = String(formData.get("key") ?? "");
  const role = await getRoleByKey(key);
  if (!role) return { error: "Rolle nicht gefunden." };

  // Aktuelle Rollen-Map laden, damit die characters.assignable-Prüfung unten
  // gegen die tatsächlichen Rollendefinitionen auflöst.
  const roleMap = await getRoleMap();

  const desired = new Set(
    formData.getAll("members").map((v) => Number(v)),
  );

  const users = await listAllUsers();
  const ip = await getClientIp();
  const added: string[] = [];
  const removed: string[] = [];

  for (const user of users) {
    // Primärrolle-Mitglieder werden hier nicht angefasst.
    if (user.role === key) continue;

    const has = user.additional_roles.includes(key);
    const want = desired.has(user.id);
    if (has === want) continue;

    const nextAdditional = want
      ? [...user.additional_roles, key]
      : user.additional_roles.filter((r) => r !== key);

    const updated = await updateUserRoles(user.id, user.role, nextAdditional);
    if (!userCan(updated, "characters.assignable", roleMap)) {
      await unassignCharactersFromUser(user.id);
    }
    await logAdminAction(
      admin.id,
      "update_roles",
      user.id,
      `${user.name} <${user.email}>: Rolle „${role.label}" ${want ? "hinzugefügt" : "entfernt"}`,
      ip,
    );
    (want ? added : removed).push(user.name);
  }

  revalidatePath("/admin/permissions");
  if (added.length === 0 && removed.length === 0) {
    return { success: true };
  }
  return { success: true };
}
