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
export default async function NewArchiveEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOwnUser(id);

  return (
    <>
      <PageMeta title="Neuer Archiv-Eintrag" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Neuen Archiv-Eintrag anlegen</h1>
        <NewArchiveEntryForm userId={user.id} />
      </article>
    </>
  );
}
