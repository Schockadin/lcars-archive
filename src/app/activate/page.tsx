import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { getUserById } from "@/lib/users";
import { peekPasswordSetupToken } from "@/lib/passwordSetupTokens";
import ActivateForm from "./ActivateForm";

export const metadata: Metadata = {
  title: "Passwort festlegen",
  robots: { index: false, follow: false },
};

// Öffentliche Route (kein Login nötig) — der Token selbst ist der Nachweis.
// Kein Nav-Eintrag, nur über den Link aus der Aktivierungs-/Reset-Mail
// erreichbar. Dieselbe Route/Mechanik bedient beide Fälle (Erstanlage über
// createUserAction UND Passwort-Reset über resetUserPasswordAction bzw.
// /forgot-password) — password_setup_tokens unterscheidet nicht zwischen
// "Aktivierung" und "Reset", ein neues Passwort zu setzen ist technisch
// identisch, daher bewusst neutrale Formulierung statt einer zweiten,
// fast identischen Route.
export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const setupToken = token ? await peekPasswordSetupToken(token) : null;
  const user = setupToken ? await getUserById(setupToken.userId) : null;

  return (
    <>
      <PageMeta title="Passwort festlegen" section="login" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff</p>
        <h1>Passwort festlegen</h1>

        <div className="lcars-text">
          {!token || !setupToken || !user ? (
            <p className="text-lcars-red">
              Dieser Link ist ungültig oder abgelaufen. Bitte wende dich an die
              Spielleitung für eine neue Einladung oder fordere unter{" "}
              <a href="/forgot-password" className="underline">
                Passwort vergessen
              </a>{" "}
              einen neuen Link an.
            </p>
          ) : (
            <div className="flex flex-col gap-[16px]">
              <p>
                Leg jetzt ein neues Passwort für <strong>{user.name}</strong>{" "}
                fest.
              </p>
              <ActivateForm token={token} />
            </div>
          )}
        </div>
      </article>
    </>
  );
}
