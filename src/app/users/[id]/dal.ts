import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import type { User } from "@/types/db";

// /users/<id> zeigt aktuell ausschließlich die eigenen Daten — ein
// abweichendes :id in der URL leitet auf die eigene Personendatei um,
// statt fremde Nutzerdaten preiszugeben.
export async function requireOwnUser(idParam: string): Promise<User> {
  const currentUser = await getCurrentUser();
  const id = Number(idParam);

  if (!Number.isInteger(id) || id !== currentUser.id) {
    redirect(`/users/${currentUser.id}`);
  }

  return currentUser;
}
