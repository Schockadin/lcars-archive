import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../dal";
import SettingsForm from "./SettingsForm";
import PasswordForm from "./PasswordForm";
import NotificationSettingsForm from "./NotificationSettingsForm";
import InstallPwaPrompt from "../InstallPwaPrompt";

export const metadata: Metadata = {
  title: "Einstellungen",
  robots: { index: false, follow: false },
};

export default async function UserSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOwnUser(id); // liefert hasPassword direkt mit

  return (
    <>
      <PageMeta title="Einstellungen" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Einstellungen</h1>
        <div className="lcars-text flex flex-col gap-[32px]">
          <section id="tutorial" className="flex flex-col gap-[8px]">
            <h2>Hilfe & Anleitung</h2>
            <p>
              Unsicher, wie etwas funktioniert? Das Tutorial erklärt alle
              Funktionen des Archivs — von der Suche bis zur
              Markdown-Formatierung.
            </p>
            <Link href="/tutorial" className="lcars-switch self-start">
              Tutorial öffnen
            </Link>
          </section>

          <SettingsForm user={{ name: user.name, email: user.email }} />

          <section id="password" className="flex flex-col gap-[12px]">
            <h2>
              {user.hasPassword ? "Passwort ändern" : "Passwort festlegen"}
            </h2>
            <PasswordForm hasPassword={user.hasPassword} />
          </section>

          <section id="notifications" className="flex flex-col gap-[12px]">
            <h2>Benachrichtigungen</h2>
            <NotificationSettingsForm
              user={{
                emailEnabled: user.email_notifications_enabled,
                pushEnabled: user.push_notifications_enabled,
              }}
            />
          </section>

          <section id="install" className="flex flex-col gap-[12px]">
            <h2>App installieren</h2>
            <InstallPwaPrompt />
          </section>
        </div>
      </article>
    </>
  );
}
