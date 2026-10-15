import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import HelpHeading from "@/components/help/HelpHeading";
import { getMyNotesAction } from "./actions";
import UserNotesBrowser from "./UserNotesBrowser";

export const metadata: Metadata = {
  title: "Meine Notizen",
  robots: { index: false, follow: false },
};

export default async function UserNotesPage() {
  const notes = await getMyNotesAction();
  return (
    <>
      <PageMeta title="Meine Notizen" section="users" />
      <div className="lcars-wide-column">
        <HelpHeading title="Meine Notizen" tutorial="notizen">
          <p>
            Hier findest du deine privaten Notizen und die für die Runde
            freigegebenen Kommentare. Mit „Neue Notiz“ kannst du auch einen
            Merkzettel ohne Eintrag anlegen. Eigene Notizen kannst du bearbeiten
            oder löschen.
          </p>
        </HelpHeading>
        <UserNotesBrowser initialNotes={notes} />
      </div>
    </>
  );
}
