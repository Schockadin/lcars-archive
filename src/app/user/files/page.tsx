import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import HelpHeading from "@/components/help/HelpHeading";
import { requireOwnUser } from "@/app/user/dal";
import { listUserCharacterFiles } from "@/lib/userFiles";
import { getOwnImagesAction } from "./actions";
import UserFilesBrowser from "./UserFilesBrowser";
import { UserFilesGuide } from "@/components/help/guides/UserGuides";

export const metadata: Metadata = {
  title: "Meine Dateien",
  robots: { index: false, follow: false },
};

export default async function UserFilesPage() {
  const user = await requireOwnUser();
  const [images, documents] = await Promise.all([
    getOwnImagesAction(),
    listUserCharacterFiles(user.id),
  ]);
  return (
    <>
      <PageMeta title="Meine Dateien" section="users" />
      <div className="lcars-wide-column">
        <HelpHeading title="Meine Dateien" tutorial="mein-bereich">
          <UserFilesGuide />
        </HelpHeading>
        <UserFilesBrowser
          initialImages={images.images}
          initialLegacy={images.legacy}
          documents={documents}
        />
      </div>
    </>
  );
}
