import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { getUserById } from "@/lib/users";
import type { User } from "@/types/db";

// React cache() dedupliziert wiederholte Aufrufe innerhalb eines
// Render-Durchlaufs (siehe Next.js-Doku zur Data Access Layer).
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const getCurrentUser = cache(async (): Promise<User> => {
  const session = await verifySession();
  const user = await getUserById(session.userId);
  if (!user) {
    // Session verweist auf einen inzwischen gelöschten User.
    redirect("/login");
  }
  return user;
});

// GM-only-Gate für /users (Nutzerverwaltung) und dessen Server Actions.
// Redirect geht auf die eigene Personendatei, nicht /login — der User ist
// angemeldet, nur für diese Seite nicht berechtigt.
export async function requireGM(): Promise<User> {
  const user = await getCurrentUser();
  if (user.role !== "gm") {
    redirect(`/users/${user.id}`);
  }
  return user;
}
