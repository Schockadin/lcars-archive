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
import { getViewer } from "@/lib/visibility";

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

  const [entry, viewer, roleMap] = await Promise.all([
    getOwnArchiveEntryForEdit(session.userId, Number(entryId)),
    getUserById(session.userId),
    getRoleMap(),
  ]);
  if (!entry) {
    redirect("/user/content");
  }

  // Versionshistorie: getOwnArchiveEntryForEdit oben hat die Eigentümerschaft
  // bereits geprüft; listRevisions prüft sie über den Viewer noch einmal
  // selbst (siehe canManageRevisions).
  const revisions = await listRevisions("archive", entry.id, await getViewer());

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
            path={`/user/archive/${entry.id}/edit`}
            revisions={revisions}
          />
        </div>
      </article>
    </>
  );
}
