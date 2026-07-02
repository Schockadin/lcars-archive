"use server";

import { redirect } from "next/navigation";
import sql from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import type { User } from "@/types/db";

export interface LoginState {
  error?: string;
}

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Bitte eine E-Mail-Adresse eingeben." };
  }

  const rows = await sql<Pick<User, "id" | "email" | "role">[]>`
    SELECT id, email, role FROM users WHERE lower(email) = ${email}
  `;
  const user = rows[0];

  if (!user) {
    return { error: "Keine Anmeldung für diese E-Mail-Adresse gefunden." };
  }

  await createSession(user);
  redirect(`/users/${user.id}`);
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
