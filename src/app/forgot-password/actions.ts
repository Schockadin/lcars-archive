"use server";

import { getUserCredentialsByEmail, listAdminEmails } from "@/lib/users";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import {
  sendPasswordResetEmail,
  sendPasswordResetRequestedEmail,
} from "@/lib/mail";
import { getBaseUrl } from "@/lib/http";

export interface ForgotPasswordState {
  submitted?: boolean;
  error?: string;
}

// Öffentliche, nicht authentifizierte Route — antwortet bewusst IMMER mit
// { submitted: true }, unabhängig davon, ob die E-Mail-Adresse existiert
// oder das Konto aktiv ist. Das verhindert, dass sich über diese Route
// erschließen lässt, welche E-Mail-Adressen registriert sind (der
// bestehende Login in src/app/login/actions.ts trifft dieselbe Abwägung
// bewusst anders, weil er dort schon eingeloggt werden soll — hier nicht
// nötig).
export async function requestPasswordResetAction(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Bitte eine E-Mail-Adresse angeben." };

  const user = await getUserCredentialsByEmail(email);
  if (user && user.is_active) {
    const rawToken = await createPasswordSetupToken(user.id);
    const resetUrl = `${await getBaseUrl()}/activate?token=${rawToken}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    // Sicherheits-Benachrichtigung an alle Admins — kein Reset-Link darin,
    // nur die Information, dass einer angefordert wurde.
    const admins = await listAdminEmails();
    await Promise.all(
      admins.map((admin) =>
        sendPasswordResetRequestedEmail({
          to: admin.email,
          name: admin.name,
          requesterEmail: user.email,
          requesterName: user.name,
        }),
      ),
    );
  }

  return { submitted: true };
}
