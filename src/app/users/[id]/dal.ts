import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import type { User } from "@/types/db";

// Für /settings: Einstellungen bearbeiten bleibt strikt Selbstbedienung,
// auch für den GM — ein abweichendes :id in der URL leitet auf die eigene
// Personendatei um, statt fremde Nutzerdaten preiszugeben oder editierbar
// zu machen.
export async function requireOwnUser(idParam: string): Promise<User> {
  const currentUser = await getCurrentUser();
  const id = Number(idParam);

  if (!Number.isInteger(id) || id !== currentUser.id) {
    redirect(`/users/${currentUser.id}`);
  }

  return currentUser;
}

export interface SelfOrGMAccess {
  viewer: User;
  target: User;
  isSelf: boolean;
}

// Für /users/[id] (Dashboard): eigene ID → immer erlaubt. Fremde ID → nur
// für den GM erlaubt (Nutzerverwaltung, siehe /users), alle anderen landen
// wie bisher auf ihrer eigenen Seite statt fremde Daten zu sehen.
export async function requireSelfOrGM(idParam: string): Promise<SelfOrGMAccess> {
  const viewer = await getCurrentUser();
  const id = Number(idParam);

  if (!Number.isInteger(id)) {
    redirect(`/users/${viewer.id}`);
  }

  if (id === viewer.id) {
    return { viewer, target: viewer, isSelf: true };
  }

  if (viewer.role !== "gm") {
    redirect(`/users/${viewer.id}`);
  }

  const target = await getUserById(id);
  if (!target) {
    redirect("/users");
  }

  return { viewer, target, isSelf: false };
}
