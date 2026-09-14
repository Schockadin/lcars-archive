import "server-only";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import type { User } from "@/types/db";
import {
  resolvePermissions,
  type Permission,
  type RoleMap,
} from "@/lib/permissions";

// Der eine Zustand jedes Inhalts. Bis v1.34 waren es zwei Achsen: visibility
// ('private' | 'gm' | 'public') UND is_draft — zwei Mechaniken für dieselbe
// Frage, und wer einen Entwurf veröffentlichen wollte, musste ihn im Editor
// öffnen und dort ein Häkchen entfernen. Geblieben ist is_draft, hier als
// sprechender Zustand: „Entwurf" oder „veröffentlicht".
export type ContentState = "draft" | "published";

export const CONTENT_STATES: ContentState[] = ["draft", "published"];

export const CONTENT_STATE_LABEL: Record<ContentState, string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
};

export function contentState(isDraft: boolean): ContentState {
  return isDraft ? "draft" : "published";
}

export function isContentState(value: string): value is ContentState {
  return (CONTENT_STATES as readonly string[]).includes(value);
}

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
// und für Stellen, die keinen vollen User-Datensatz haben. Ohne roleMap gelten
// die eingebauten DEFAULT_ROLE_PRESETS.
export function makeViewer(
  userId: number,
  roles: User["role"][],
  overrides: Record<string, boolean> = {},
  roleMap?: RoleMap,
): Viewer {
  return {
    userId,
    role: roles[0] ?? "guest",
    permissions: [...resolvePermissions(roles, overrides, roleMap)],
  };
}

// Baut einen Viewer (inkl. effektiver Rechte) aus einem vollen User-Objekt —
// zentral, damit jede Stelle die Rechte identisch auflöst. roleMap ist PFLICHT
// (frisch aus der DB, getRoleMap) — kein Modul-Global mehr.
export function resolveViewer(user: User, roleMap: RoleMap): Viewer {
  const roles = Array.from(new Set([user.role, ...user.additional_roles]));
  return {
    userId: user.id,
    role: user.role,
    permissions: [
      ...resolvePermissions(roles, user.permission_overrides, roleMap),
    ],
  };
}

// Betrachter frisch aus der DB auflösen (Rolle nie aus dem Cookie übernehmen,
// siehe requireGM/requireAdmin in src/lib/dal.ts) — aber ohne Redirect: ein
// anonymer Betrachter (Rückgabe null) ist hier ein gültiger Fall, der alles
// Veröffentlichte sieht — aber keine Entwürfe.

export async function getViewer(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  // Deaktivierte Person bzw. veraltete session_version wie in getCurrentUser
  // (dal.ts) behandeln — sonst behielte ein bereits ausgestelltes Cookie die
  // erhöhte Lese-Sichtbarkeit (content.view_all) auf den
  // öffentlichen Inhaltsseiten und dem Bild-Endpoint bis zum natürlichen
  // Cookie-Ablauf (30 Tage), obwohl das Konto deaktiviert oder das Passwort
  // (session_version) seither geändert wurde. Rückgabe null = anonymer
  // Betrachter (nur public), der sichere Fallback dieser Funktion.
  if (!user.is_active) return null;
  if (session.sessionVersion !== user.session_version) return null;
  // Rollen-Map laden und explizit an die Rechte-Auflösung durchreichen
  // (öffentliche Seiten gehen über getViewer, nicht über getCurrentUser).
  const roleMap = await getRoleMap();
  return resolveViewer(user, roleMap);
}

// Darf dieser Betrachter diesen Inhalt sehen? Veröffentlicht heißt: jede und
// jeder, auch ohne Anmeldung. Ein Entwurf gehört nur der Owner-Person — nicht
// einmal die Spielleitung sieht ihn; „alles sehen" (content.view_all) bleibt
// der eine Bypass für die Administration, die Inhalte auch im Papierkorb und
// in den Übersichten verwalten können muss.
//
// ownerId ist die für den Inhaltstyp zuständige Owner-Spalte (player_id bei
// Charakteren, owner_user_id bei Mission-Logs/Archiv-Einträgen — siehe
// scripts/schema.sql).
export function canView(
  isDraft: boolean,
  ownerId: number | null,
  viewer: Viewer | null,
): boolean {
  if (!isDraft) return true;
  if (viewer?.permissions.includes("content.view_all")) return true;
  return viewer != null && ownerId != null && viewer.userId === ownerId;
}

// Darf dieser Betrachter veröffentlichen bzw. zurückziehen? Nur die
// Owner-Person selbst — wie bisher bei der Sichtbarkeit. Für fremde Inhalte
// gibt es den Weg über die Moderation (content.moderate, siehe
// app/actions/visibility.ts).
export function canSetContentState(
  ownerId: number | null,
  viewer: Viewer | null,
): boolean {
  return viewer != null && ownerId != null && viewer.userId === ownerId;
}

// Darf dieser Betrachter im Gespräch für einen NPC schreiben (also einen
// Datenbank-Eintrag der Kategorie "npc" sprechen)? Die Spielleitung
// (gm.access) ist der
// Normalfall; die Administration (admin.access) kommt dazu, weil in kleinen
// Runden dasselbe Konto beides ist — und ein Admin, der ohnehin jedes
// Gespräch moderieren darf, soll nicht ausgerechnet daran scheitern, eine
// Wirtin sprechen zu lassen.
export function canPlayNpcs(viewer: Viewer | null): boolean {
  return (
    viewerHasPermission(viewer, "gm.access") ||
    viewerHasPermission(viewer, "admin.access")
  );
}

// Entwurf-Gate für Missionen: anders als bei Charakteren/Missionslogs/
// Archiv-Einträgen (canView oben, dort strikt Owner-only) dürfen hier ALLE
// GM/Admin einen Mission-Entwurf sehen, nicht nur die anlegende Person —
// Missionen haben kein Einzel-Owner-Bearbeitungsmodell, jeder GM/Admin darf
// jede Mission ohnehin bearbeiten (siehe missionAction in
// user/missions/_shared/contentAction.ts).
export function canViewMissionDraft(
  isDraft: boolean,
  viewer: Viewer | null,
): boolean {
  if (!isDraft) return true;
  // Wer Missionen verwaltet (missions.manage) oder alles sieht
  // (content.view_all) darf auch Mission-Entwürfe sehen.
  return (
    viewer != null &&
    (viewer.permissions.includes("missions.manage") ||
      viewer.permissions.includes("content.view_all"))
  );
}
