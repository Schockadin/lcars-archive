import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

// Keine Verlinkung im Hauptmenü — Seite ist bewusst nur über die direkte
// URL erreichbar, siehe MAIN_NAV (src/lib/nav.ts).
export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getSession();

  // Bereits angemeldet — die eigene Personendatei ist der eigentliche
  // Ziel-Bereich, /login ist nur der Einstieg dorthin.
  if (session) {
    redirect("/user");
  }

  return (
    <>
      <PageMeta title="Login" section="login" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff</p>
        <h1>Login</h1>
        <div className="lcars-text">
          <LoginForm />
        </div>
      </article>
    </>
  );
}
