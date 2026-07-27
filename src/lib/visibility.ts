import "server-only";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import type { User } from "@/types/db";
import {
  resolvePermissions,
  type Permission,
} from "@/lib/permissions";

export type Visibility = "private" | "gm" | "public";

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "Privat",
  gm: "GM",
  public: "Öffentlich",
};

export const VISIBILITY_OPTIONS: Visibility[] = ["private", "gm", "public"];

export interface Viewer {
  userId: number;
  role: User["role"];
  // Effektive Rechte (aus allen Rollen + Overrides, siehe permissions.ts).
  // Bewusst ein Array (kein Set): Viewer wird an Client-Komponenten
  // durchgereicht und muss über die RSC-Grenze serialisierbar sein.
  permissions: Permission[];
}

// Kleiner Helfer für Server UND Client (statt selbst mit dem Array zu
// hantieren).
export function viewerHasPermission(
  viewer: Viewer | null,
  permission: Permission,
): boolean {
  return viewer != null && viewer.permissions.includes(permission);
}

// Baut einen Viewer aus Rollen (+ optionalen Overrides) — praktisch für Tests
// und für Stellen, die keinen vollen User-Datensatz haben.
export function makeViewer(
  userId: number,
  roles: User["role"][],
  overrides: Record<string, boolean> = {},
): Viewer {
  return {
    userId,
    role: roles[0] ?? "guest",
    permissions: [...resolvePermissions(roles, overrides)],
  };
}

// Baut einen Viewer (inkl. effektiver Rechte) aus einem vollen User-Objekt —
// zentral, damit jede Stelle die Rechte identisch auflöst.
export function resolveViewer(user: User): Viewer {
  const roles = Array.from(new Set([user.role, ...user.additional_roles]));
  return {
    userId: user.id,
    role: user.role,
    permissions: [...resolvePermissions(roles, user.permission_overrides)],
  };
}

// Betrachter frisch aus der DB auflösen (Rolle nie aus dem Cookie übernehmen,
// siehe requireGM/requireAdmin in src/lib/dal.ts) — aber ohne Redirect: ein
// anonymer Betrachter (Rückgabe null) ist hier ein gültiger Fall, der nur
// public-Inhalte sieht.

export async function getViewer(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  // Aktive Rollen-Map laden, bevor die Rechte des Betrachters aufgelöst werden
  // (öffentliche Seiten gehen über getViewer, nicht über getCurrentUser).
  await getRoleMap();
  return resolveViewer(user);
}

// „GM-Sicht“ heißt jetzt: darf gm-sichtbare Inhalte sehen (content.view_gm).
function canViewGm(viewer: Viewer | null): boolean {
  return viewer != null && viewer.permissions.includes("content.view_gm");
}

// Darf dieser Betrachter einen Inhalt mit dieser visibility/Owner sehen?
// ownerId ist die für den Inhaltstyp zuständige Owner-Spalte (player_id bei
// Charakteren, owner_user_id bei Mission-Logs/Archiv-Einträgen — siehe
// scripts/schema.sql).
//
// Admin sieht IMMER alles, auch "private" (bewusster Bypass für die
// Admin-Owner-Verwaltung: Admins sollen Owner auch auf sonst privaten
// Inhalten sehen/ändern können — anders als "gm", dessen private-Sperre
// unverändert bestehen bleibt).
export function canView(
  visibility: Visibility,
  ownerId: number | null,
  viewer: Viewer | null,
): boolean {
  if (visibility === "public") return true;
  // „Alles sehen“ (content.view_all) ist der frühere Admin-Bypass.
  if (viewer?.permissions.includes("content.view_all")) return true;
  if (viewer && ownerId != null && viewer.userId === ownerId) return true;
  return visibility === "gm" && canViewGm(viewer);
}

// Darf dieser Betrachter die Sichtbarkeit dieses Inhalts ändern? Nur der
// Owner selbst — auch ein GM/Admin darf fremde Inhalte hier nicht
// umstellen (das wäre ein eigenes, hier nicht gebautes Feature).
export function canSetVisibility(
  ownerId: number | null,
  viewer: Viewer | null,
): boolean {
  return viewer != null && ownerId != null && viewer.userId === ownerId;
}

// Entwürfe (is_draft, siehe scripts/schema.sql) sind eine eigene, striktere
// Sichtbarkeitsachse als canView oben: unabhängig von visibility sieht sie
// NIEMAND außer dem Owner selbst — bewusst OHNE Admin-Bypass (anders als
// canView), da ein Entwurf schlicht noch nicht existieren soll, solange die
// Owner-Person ihn nicht veröffentlicht. Gilt nur für Charaktere/Missionen/
// Missionslogs/Archiv-Einträge; Dialoge kennen kein Entwurf-Konzept.
export function canViewDraft(
  isDraft: boolean,
  ownerId: number | null,
  viewer: Viewer | null,
): boolean {
  if (!isDraft) return true;
  return viewer != null && ownerId != null && viewer.userId === ownerId;
}

// Entwurf-Gate für Missionen: anders als bei Charakteren/Missionslogs/
// Archiv-Einträgen (canViewDraft oben, dort strikt Owner-only) dürfen hier
// ALLE GM/Admin einen Mission-Entwurf sehen, nicht nur die anlegende Person
// — Missionen haben kein Einzel-Owner-Bearbeitungsmodell, jeder GM/Admin
// darf jede Mission ohnehin bearbeiten (siehe missionAction in
// user/missions/_shared/contentAction.ts). canViewDraft passt mit seinem
// strikten ownerId-Vergleich hier deshalb nicht.
export function canViewMissionDraft(
  isDraft: boolean,
  viewer: Viewer | null,
): boolean {
  if (!isDraft) return true;
  // Wer Missionen verwaltet (missions.manage) oder alles sieht (content.view_all)
  // darf auch Mission-Entwürfe sehen — Entsprechung zum früheren „gm oder admin“.
  return (
    viewer != null &&
    (viewer.permissions.includes("missions.manage") ||
      viewer.permissions.includes("content.view_all"))
  );
}
