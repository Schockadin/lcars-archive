import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import HelpHeading from "@/components/help/HelpHeading";
import { getOwnFilesAction } from "./actions";
import UserFilesBrowser from "./UserFilesBrowser";
import { UserFilesGuide } from "@/components/help/guides/UserGuides";

export const metadata: Metadata = {
  title: "Meine Dateien",
  robots: { index: false, follow: false },
};

export default async function UserFilesPage() {
  const files = await getOwnFilesAction();
  return (
    <>
      <PageMeta title="Meine Dateien" section="users" />
      <div className="lcars-wide-column">
        <HelpHeading title="Meine Dateien" tutorial="mein-bereich">
          <UserFilesGuide />
        </HelpHeading>
        <UserFilesBrowser
          initialImages={files.images}
          initialLegacy={files.legacy}
          initialDocuments={files.documents}
          initialCharacters={files.characters}
          initialLinkedImages={files.linkedImages}
        />
      </div>
    </>
  );
}
