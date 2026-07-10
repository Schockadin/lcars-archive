import "server-only";
import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
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

// Gate für /admin (Nutzerverwaltung): darf betreten, wer gm ODER admin ist —
// die Seite selbst zeigt je nach Rolle unterschiedliche Abschnitte (siehe
// requireAdmin unten für die strengere Admin-only-Prüfung der
// Useraccount-Verwaltungs-Actions). forbidden() (nicht redirect) — der User
// ist angemeldet, nur für diese Seite nicht berechtigt (siehe
// app/forbidden.tsx).
export async function requireGM(): Promise<User> {
  const user = await getCurrentUser();
  if (user.role !== "gm" && user.role !== "admin") {
    forbidden();
  }
  return user;
}

// Strenger als requireGM: nur für Useraccount-Verwaltung (anlegen, Rolle
// ändern, deaktivieren, löschen, bearbeiten) — ein reiner gm darf weiterhin
// nur Charaktere zuweisen (assignCharacterAction bleibt bei requireGM).
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    forbidden();
  }
  return user;
}

// Gate für /users (Userübersicht) und /users/[id] (öffentliches Profil):
// jede Rolle außer guest darf rein — Gäste dürfen laut Produktentscheidung
// nur Inhalte ansehen/bookmarken/abonnieren (siehe scripts/schema.sql), eine
// Userliste mit Subscribe-Aktion gehört nicht dazu.
export async function requireNonGuest(): Promise<User> {
  const user = await getCurrentUser();
  if (user.role === "guest") {
    forbidden();
  }
  return user;
}
