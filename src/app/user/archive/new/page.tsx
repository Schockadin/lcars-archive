import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../../dal";
import NewArchiveEntryForm from "./NewArchiveEntryForm";

export const metadata: Metadata = {
  title: "Neuer Archiv-Eintrag",
  robots: { index: false, follow: false },
};

// Anders als Missionen (nur gm/admin) oder Missionslogs (nur mit eigenem
// Charakter) darf JEDER eingeloggte User Archiv-Einträge anlegen — daher
// requireOwnUser statt requireOwnGM/requireOwnCharacters (keine Rollen-/
// Charakter-Voraussetzung).
export default async function NewArchiveEntryPage() {
  const user = await requireOwnUser();

  return (
    <>
      <PageMeta title="Neuer Archiv-Eintrag" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Neuen Archiv-Eintrag anlegen</h1>
        <NewArchiveEntryForm
          userId={user.id}
          isAdminOrGM={user.role === "gm" || user.role === "admin"}
        />
      </article>
    </>
  );
}
