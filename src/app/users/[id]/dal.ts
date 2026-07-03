import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, verifySession } from "@/lib/dal";
import { getUserById, getUserWithPasswordStatus } from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import type { User } from "@/types/db";
import type { UserWithPasswordStatus } from "@/lib/users";
import type { Character } from "@/types/character";

// Für /settings: Einstellungen bearbeiten bleibt strikt Selbstbedienung,
// auch für den GM. Der Identitätsvergleich (":id" aus der URL == meine
// eigene) kommt bewusst nur aus dem signierten Cookie (verifySession,
// kein DB-Zugriff) — das Cookie ist kryptografisch signiert, niemand kann
// dort eine fremde userId hineinfälschen, ein DB-Abgleich bringt für diese
// reine Identitätsprüfung keine zusätzliche Sicherheit. Der User-Datensatz
// (inkl. hasPassword, in einer Query statt zwei) wird erst danach geholt,
// weil Name/E-Mail/Passwort-Status fürs Formular gebraucht werden — hier
// ist ein DB-Zugriff unvermeidbar.
export async function requireOwnUser(
  idParam: string,
): Promise<UserWithPasswordStatus> {
  const session = await verifySession();
  const id = Number(idParam);

  if (!Number.isInteger(id) || id !== session.userId) {
    redirect(`/users/${session.userId}`);
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
  if (viewer.role !== "gm") {
    redirect(`/users/${viewer.id}`);
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

// Für /users/[id]/dialogues/new: Identität wie requireOwnUser (Cookie-
// basiert). Redirectet NICHT bei 0 Charakteren — die Seite selbst zeigt in
// dem Fall einen Hinweis statt des Formulars (Verteidigung in der Tiefe
// zusätzlich zum ausgeblendeten Dashboard-Button, siehe DialogueSection).
export async function requireOwnCharacters(
  idParam: string,
): Promise<OwnCharactersAccess> {
  const session = await verifySession();
  const id = Number(idParam);

  if (!Number.isInteger(id) || id !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const user = await getUserWithPasswordStatus(session.userId);
  if (!user) {
    redirect("/login");
  }

  const characters = await getCharactersForUser(session.userId);
  return { user, characters };
}
