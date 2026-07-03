import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../dal";
import SettingsForm from "./SettingsForm";
import PasswordForm from "./PasswordForm";

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
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <h1>Einstellungen</h1>
        <div className="lcars-text flex flex-col gap-[32px]">
          <SettingsForm user={{ name: user.name, email: user.email }} />

          <section id="password" className="flex flex-col gap-[12px]">
            <h2>
              {user.hasPassword ? "Passwort ändern" : "Passwort festlegen"}
            </h2>
            <PasswordForm hasPassword={user.hasPassword} />
          </section>
        </div>
      </article>
    </>
  );
}
