"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { getUserCredentialsByEmail, recordLogin } from "@/lib/users";
import { verifyPassword } from "@/lib/password";

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
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "Bitte eine E-Mail-Adresse eingeben." };
  }

  const user = await getUserCredentialsByEmail(email);

  if (!user) {
    return { error: "Keine Anmeldung für diese E-Mail-Adresse gefunden." };
  }

  if (user.password_hash) {
    if (!password || !(await verifyPassword(password, user.password_hash))) {
      return { error: "E-Mail-Adresse oder Passwort ist falsch." };
    }
  } else if (user.requires_activation) {
    // Vom GM angelegt, aber der Aktivierungslink wurde noch nicht benutzt.
    return {
      error:
        "Dieses Konto ist noch nicht aktiviert. Bitte nutze den Link aus deiner Einladungs-E-Mail.",
    };
  }
  // Sonst: Bestandskonto ohne Passwort (vor der Passwort-Einführung
  // angelegt) — Login per E-Mail allein bleibt erlaubt, bis selbst ein
  // Passwort gesetzt wird (siehe /users/[id]/settings).

  await recordLogin(user.id);
  await createSession(user);
  redirect(`/users/${user.id}`);
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
