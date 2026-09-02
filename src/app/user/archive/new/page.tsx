import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../../dal";
import NewArchiveEntryForm from "./NewArchiveEntryForm";

export const metadata: Metadata = {
  title: "Neuer Datenbank-Eintrag",
  robots: { index: false, follow: false },
};

// Anders als Missionen (nur gm/admin) oder Missionslogs (nur mit eigenem
// Charakter) darf JEDER eingeloggte User Archiv-Einträge anlegen — daher
// requireOwnUser statt requireOwnGM/requireOwnCharacters (keine Rollen-/
// Charakter-Voraussetzung).
export default async function NewArchiveEntryPage() {
  const user = await requireOwnUser();
  const roleMap = await getRoleMap();

  return (
    <>
      <PageMeta title="Neuer Datenbank-Eintrag" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Neuen Datenbank-Eintrag anlegen</h1>
        <NewArchiveEntryForm
          userId={user.id}
          isAdminOrGM={userCan(user, "content.autolink_tools", roleMap)}
        />
      </article>
    </>
  );
}
