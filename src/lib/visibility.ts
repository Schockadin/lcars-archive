import "server-only";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import type { User } from "@/types/db";

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
}

// Betrachter frisch aus der DB auflösen (Rolle nie aus dem Cookie
// übernehmen, siehe requireGM/requireAdmin in src/lib/dal.ts) — aber ohne
// Redirect: ein anonymer Betrachter (Rückgabe null) ist hier ein gültiger
// Fall, der nur public-Inhalte sieht.
export async function getViewer(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return { userId: user.id, role: user.role };
}

function isGmOrAdmin(viewer: Viewer | null): boolean {
  return viewer?.role === "gm" || viewer?.role === "admin";
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
  if (viewer?.role === "admin") return true;
  if (viewer && ownerId != null && viewer.userId === ownerId) return true;
  return visibility === "gm" && isGmOrAdmin(viewer);
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
