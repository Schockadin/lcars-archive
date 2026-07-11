import "server-only";
import { redirect, forbidden } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserWithPasswordStatus } from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import type { UserWithPasswordStatus } from "@/lib/users";
import type { Character } from "@/types/character";

// Reine Identitätsprüfung ohne Rollen-/Charakter-Voraussetzung — genutzt von
// der eigenen Konto-Verwaltung (Profil-Seite, Settings-Teil davon, bleibt
// strikt Selbstbedienung auch für den GM) sowie von Formularen ohne weitere
// Voraussetzung (Archiv-Eintrag/Charakter anlegen, siehe die jeweiligen
// requireOwnUser-Aufrufer). /user liegt (anders als früher /user/[id]) ohne
// eigenes :id-Segment in der URL — die Identität kommt ausschließlich aus dem
// signierten Session-Cookie (verifySession), ein Vergleich mit einer
// URL-ID entfällt damit ersatzlos. Der User-Datensatz (inkl. hasPassword, in
// einer Query statt zwei) wird erst danach geholt, weil Name/E-Mail/
// Passwort-Status fürs Formular gebraucht werden — hier ist ein DB-Zugriff
// unvermeidbar. /user ist reine Selbstbedienung — das Betrachten FREMDER
// User (Profil-Übersicht mit deren öffentlichen Inhalten) lebt unter
// /users/[id] (Plural), nicht mehr hier.
export async function requireOwnUser(): Promise<UserWithPasswordStatus> {
  const session = await verifySession();

  const user = await getUserWithPasswordStatus(session.userId);
  if (!user) {
    redirect("/login");
  }

  return user;
}

export interface OwnCharactersAccess {
  user: UserWithPasswordStatus;
  characters: Character[];
}

// Für /user/dialogues/new (und mission-logs/new): Identität wie
// requireOwnUser (Session-Cookie). Redirectet NICHT bei 0 Charakteren — die
// Seite selbst zeigt in dem Fall einen Hinweis statt des Formulars
// (Verteidigung in der Tiefe zusätzlich zu den ausgeblendeten Buttons in
// content/page.tsx).
export async function requireOwnCharacters(): Promise<OwnCharactersAccess> {
  const session = await verifySession();

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

// Für /user/missions/new (und .../missions/[missionId]/edit): Identität wie
// requireOwnCharacters (Session-Cookie), zusätzlich muss die Rolle admin/gm
// sein — nur die Spielleitung legt Missionen an bzw. bearbeitet sie. Rolle
// frisch aus der DB geprüft, nicht aus dem Cookie, damit ein gerade
// entzogenes GM-Recht sofort greift.
export async function requireOwnGM(): Promise<OwnGMAccess> {
  const session = await verifySession();

  const user = await getUserWithPasswordStatus(session.userId);
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "gm" && user.role !== "admin") {
    forbidden();
  }

  return { user };
}
