import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import ForgotPasswordForm from "./ForgotPasswordForm";

// Keine Verlinkung im Hauptmenü — analog /login, nur über den Link auf der
// Login-Seite erreichbar.
export const metadata: Metadata = {
  title: "Passwort vergessen",
  robots: { index: false, follow: false },
};

// Öffentliche Route (kein Login nötig) — die Action selbst prüft, ob die
// E-Mail-Adresse existiert (siehe actions.ts), die Seite braucht dafür
// keinen eigenen State.
export default function ForgotPasswordPage() {
  return (
    <>
      <PageMeta title="Passwort vergessen" section="login" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff</p>
        <h1>Passwort vergessen</h1>
        <div className="lcars-text">
          <ForgotPasswordForm />
        </div>
      </article>
    </>
  );
}
