import "server-only";
import { redirect, forbidden } from "next/navigation";
import { getCurrentUser, requireAdmin, verifySession } from "@/lib/dal";
import {
  getUserById,
  getUserForAdmin,
  getUserWithPasswordStatus,
} from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import type { User } from "@/types/db";
import type { UserAdminDetail, UserWithPasswordStatus } from "@/lib/users";
import type { Character } from "@/types/character";

// Reine Identitätsprüfung ohne Rollen-/Charakter-Voraussetzung — genutzt
// von der eigenen Konto-Verwaltung (Profil-Seite, Settings-Teil davon,
// bleibt strikt Selbstbedienung auch für den GM) sowie von Formularen ohne
// weitere Voraussetzung (Archiv-Eintrag/Charakter anlegen, siehe die
// jeweiligen requireOwnUser-Aufrufer). Der Identitätsvergleich (":id" aus
// der URL == meine eigene) kommt bewusst nur aus dem signierten Cookie
// (verifySession,
// kein DB-Zugriff) — das Cookie ist kryptografisch signiert, niemand kann
// dort eine fremde userId hineinfälschen, ein DB-Abgleich bringt für diese
// reine Identitätsprüfung keine zusätzliche Sicherheit. Der User-Datensatz
// (inkl. hasPassword, in einer Query statt zwei) wird erst danach geholt,
// weil Name/E-Mail/Passwort-Status fürs Formular gebraucht werden — hier
// ist ein DB-Zugriff unvermeidbar. forbidden() statt redirect: eine fremde
// ID ist ein echter Zugriffsversuch auf einen anderen Account, kein bloß
// falscher Pfad (siehe app/forbidden.tsx).
export async function requireOwnUser(
  idParam: string,
): Promise<UserWithPasswordStatus> {
  const session = await verifySession();
  const id = Number(idParam);

  if (!Number.isInteger(id) || id !== session.userId) {
    forbidden();
  }

  const user = await getUserWithPasswordStatus(session.userId);
  if (!user) {
    redirect("/login");
  }

  return user;
}

export interface SelfOrGMAccess {
  viewer: User;
  target: User;
  isSelf: boolean;
}

// Für /users/[id] (Dashboard): eigene ID → immer erlaubt, Entscheidung rein
// aus dem Cookie (kein DB-Zugriff nötig, siehe requireOwnUser oben — der
// User-Datensatz wird trotzdem geladen, weil Name/Rolle/previous_login_at
// für die Anzeige gebraucht werden).
//
// Fremde ID → nur für den GM erlaubt. Diese Rollen-Entscheidung wird
// bewusst NICHT aus dem Cookie getroffen, sondern per getCurrentUser()
// frisch aus der DB — anders als bei der reinen Identitätsprüfung geht es
// hier um eine Berechtigung, die sich durch eine fremde Aktion (der GM
// ändert Rollen über /users) ändern kann. Mit einer Cookie-basierten
// Prüfung würde eine gerade entzogene GM-Rolle bis zum nächsten Login der
// betroffenen Person weiter gelten.
export async function requireSelfOrGM(idParam: string): Promise<SelfOrGMAccess> {
  const session = await verifySession();
  const id = Number(idParam);

  if (!Number.isInteger(id)) {
    redirect(`/users/${session.userId}`);
  }

  if (id === session.userId) {
    const viewer = await getUserById(session.userId);
    if (!viewer) {
      redirect("/login");
    }
    return { viewer, target: viewer, isSelf: true };
  }

  const viewer = await getCurrentUser();
  if (viewer.role !== "gm" && viewer.role !== "admin") {
    forbidden();
  }

  const target = await getUserById(id);
  if (!target) {
    redirect("/users");
  }

  return { viewer, target, isSelf: false };
}

export interface OwnCharactersAccess {
  user: UserWithPasswordStatus;
  characters: Character[];
}

// Für /users/[id]/dialogues/new (und mission-logs/new): Identität wie
// requireOwnUser (Cookie-basiert, forbidden() bei fremder ID). Redirectet
// NICHT bei 0 Charakteren — die Seite selbst zeigt in dem Fall einen
// Hinweis statt des Formulars (Verteidigung in der Tiefe zusätzlich zu den
// ausgeblendeten Buttons in content/page.tsx).
export async function requireOwnCharacters(
  idParam: string,
): Promise<OwnCharactersAccess> {
  const session = await verifySession();
  const id = Number(idParam);

  if (!Number.isInteger(id) || id !== session.userId) {
    forbidden();
  }

  const user = await getUserWithPasswordStatus(session.userId);
  if (!user) {
    redirect("/login");
  }

  const characters = await getCharactersForUser(session.userId);
  return { user, characters };
}

export interface OwnGMAccess {
  user: UserWithPasswordStatus;
}

// Für /users/[id]/missions/new (und .../missions/[missionId]/edit): Identität
// wie requireOwnCharacters (Cookie-basiert, forbidden() bei fremder ID),
// zusätzlich muss die Rolle admin/gm sein — nur die Spielleitung legt
// Missionen an bzw. bearbeitet sie. Rolle frisch aus der DB geprüft (wie
// requireSelfOrGM), nicht aus dem Cookie, damit ein gerade entzogenes
// GM-Recht sofort greift.
export async function requireOwnGM(idParam: string): Promise<OwnGMAccess> {
  const session = await verifySession();
  const id = Number(idParam);

  if (!Number.isInteger(id) || id !== session.userId) {
    forbidden();
  }

  const user = await getUserWithPasswordStatus(session.userId);
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "gm" && user.role !== "admin") {
    forbidden();
  }

  return { user };
}

export interface AdminEditTargetAccess {
  viewer: User;
  target: UserAdminDetail;
}

// Für /users/[id]/edit: strikt admin-only (nicht requireSelfOrGM — die
// Useraccount-Bearbeitung selbst ist admin-only, siehe requireAdmin in
// src/lib/dal.ts und der gleiche Grundsatz in src/app/users/actions.ts;
// ein reiner gm darf hier nicht rein, auch nicht für sich selbst — dafür
// gibt es die eigene Profil-Seite). requireAdmin() prüft frisch aus der DB, nicht aus
// dem Cookie, damit ein gerade entzogenes Admin-Recht sofort greift.
export async function requireAdminEditTarget(
  idParam: string,
): Promise<AdminEditTargetAccess> {
  const viewer = await requireAdmin();

  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    redirect("/users");
  }

  const target = await getUserForAdmin(id);
  if (!target) {
    redirect("/users");
  }

  return { viewer, target };
}
