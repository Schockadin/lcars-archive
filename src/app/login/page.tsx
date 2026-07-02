import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { getSession } from "@/lib/session";
import { logout } from "./actions";
import LoginForm from "./LoginForm";

// Keine Verlinkung im Hauptmenü — Seite ist bewusst nur über die direkte
// URL erreichbar, siehe MAIN_NAV (src/lib/nav.ts).
export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getSession();

  return (
    <>
      <PageMeta title="Login" section="login" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff</p>
        <h1>Login</h1>

        {session ? (
          <div className="lcars-text flex flex-col gap-[16px]">
            <p>
              Angemeldet als <strong>{session.email}</strong> (
              {session.role}).
            </p>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lcars-pill bg-lcars-surface-2 px-[24px] py-[8px] font-lcars uppercase tracking-wide text-lcars-text-contrast"
              >
                Abmelden
              </button>
            </form>
          </div>
        ) : (
          <div className="lcars-text">
            <LoginForm />
          </div>
        )}
      </article>
    </>
  );
}
