import "server-only";
import { redirect, forbidden } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserWithPasswordStatus } from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import type { UserWithPasswordStatus } from "@/lib/users";
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
// falscher Pfad (siehe app/forbidden.tsx). /user/[id] ist reine
// Selbstbedienung — das Betrachten FREMDER User (Profil-Übersicht mit deren
// öffentlichen Inhalten) lebt seit dem Routing-Split unter /users/[id],
// nicht mehr hier (früheres requireSelfOrGM mit isSelf-Verzweigung entfiel
// deshalb ersatzlos).
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

export interface OwnCharactersAccess {
  user: UserWithPasswordStatus;
  characters: Character[];
}

// Für /user/[id]/dialogues/new (und mission-logs/new): Identität wie
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

// Für /user/[id]/missions/new (und .../missions/[missionId]/edit): Identität
// wie requireOwnCharacters (Cookie-basiert, forbidden() bei fremder ID),
// zusätzlich muss die Rolle admin/gm sein — nur die Spielleitung legt
// Missionen an bzw. bearbeitet sie. Rolle frisch aus der DB geprüft, nicht
// aus dem Cookie, damit ein gerade entzogenes GM-Recht sofort greift.
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
