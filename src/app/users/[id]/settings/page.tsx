import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../dal";
import SettingsForm from "./SettingsForm";

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
  const user = await requireOwnUser(id);

  return (
    <>
      <PageMeta title="Einstellungen" section="users" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Personendatei</p>
        <h1>Einstellungen</h1>
        <div className="lcars-text">
          <SettingsForm user={{ name: user.name, email: user.email }} />
        </div>
      </article>
    </>
  );
}
