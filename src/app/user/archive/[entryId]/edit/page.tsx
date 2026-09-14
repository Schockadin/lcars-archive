import { userCan } from "@/lib/permissions";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession, getRoleMap } from "@/lib/dal";
import { getOwnArchiveEntryForEdit } from "@/lib/archive";
import { getUserById } from "@/lib/users";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import EditArchiveEntryForm from "./EditArchiveEntryForm";
import RevisionsPanel from "@/app/_shared/RevisionsPanel";
import { listRevisions } from "@/lib/contentRevisions";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import {
  archiveEditHref,
} from "@/lib/contentRoutes";

export const metadata: Metadata = {
  title: "Datenbank-Eintrag bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditArchiveEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const session = await verifySession();

  // Der Bearbeiten-Stift auf der Leseseite führt seit v1.34 hierher — auch
  // für Spielleitung/Administration auf einem fremden Eintrag (siehe
  // ActionsMenu.tsx). Ohne content.moderate bleibt die Abfrage owner-gescoped
  // und ein fremder Eintrag führt zurück auf die eigenen Inhalte.
  const contentViewer = await getViewer();
  const asModerator = viewerHasPermission(contentViewer, "content.moderate");

  const [entry, viewer, roleMap] = await Promise.all([
    getOwnArchiveEntryForEdit(session.userId, Number(entryId), asModerator),
    getUserById(session.userId),
    getRoleMap(),
  ]);
  if (!entry) {
    redirect("/user/content");
  }

  // Versionshistorie: die Abfrage oben hat den Zugriff bereits geprüft;
  // listRevisions prüft ihn über den Viewer noch einmal selbst (siehe
  // canManageRevisions).
  const revisions = await listRevisions("archive", entry.id, contentViewer);

  return (
    <>
      <PageMeta title="Datenbank-Eintrag bearbeiten" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <h1>Datenbank-Eintrag bearbeiten</h1>
        <p className="lcars-text text-[13px] opacity-80">
          {CATEGORY_CONFIG[entry.category].label}
        </p>

        <EditArchiveEntryForm
          userId={session.userId}
          entry={entry}
          isAdminOrGM={
            !!viewer && userCan(viewer, "content.autolink_tools", roleMap)
          }
        />

        <div className="mt-[16px]">
          <RevisionsPanel
            contentType="archive"
            contentId={entry.id}
            path={archiveEditHref(entry.id)}
            revisions={revisions}
          />
        </div>
      </article>
    </>
  );
}
