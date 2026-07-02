import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { getUserById } from "@/lib/users";
import { peekPasswordSetupToken } from "@/lib/passwordSetupTokens";
import ActivateForm from "./ActivateForm";

export const metadata: Metadata = {
  title: "Konto aktivieren",
  robots: { index: false, follow: false },
};

// Öffentliche Route (kein Login nötig) — der Token selbst ist der Nachweis.
// Kein Nav-Eintrag, nur über den Link aus der Aktivierungs-Mail erreichbar.
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
      <PageMeta title="Konto aktivieren" section="login" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff</p>
        <h1>Konto aktivieren</h1>

        <div className="lcars-text">
          {!token || !setupToken || !user ? (
            <p className="text-lcars-red">
              Dieser Link ist ungültig oder abgelaufen. Bitte wende dich an
              die Spielleitung für eine neue Einladung.
            </p>
          ) : (
            <div className="flex flex-col gap-[16px]">
              <p>
                Willkommen, <strong>{user.name}</strong>. Leg jetzt ein
                Passwort fest, um dein Konto zu aktivieren.
              </p>
              <ActivateForm token={token} />
            </div>
          )}
        </div>
      </article>
    </>
  );
}
