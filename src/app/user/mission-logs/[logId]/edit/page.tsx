import { userCan } from "@/lib/permissions";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession, getRoleMap } from "@/lib/dal";
import { getOwnMissionLogForEdit } from "@/lib/missions";
import { getUserById } from "@/lib/users";
import EditMissionLogForm from "./EditMissionLogForm";
import RevisionsPanel from "@/app/_shared/RevisionsPanel";
import { listRevisions } from "@/lib/contentRevisions";
import { getViewer } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Missionslog bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditMissionLogPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = await params;
  const session = await verifySession();

  const [log, viewer, roleMap] = await Promise.all([
    getOwnMissionLogForEdit(session.userId, Number(logId)),
    getUserById(session.userId),
    getRoleMap(),
  ]);
  if (!log) {
    redirect("/user/content");
  }

  const revisions = await listRevisions("mission_log", log.id, await getViewer());

  return (
    <>
      <PageMeta title="Missionslog bearbeiten" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <h1>Missionslog bearbeiten</h1>
        <p className="lcars-text text-[13px] opacity-80">
          {log.authorName} · {log.missionTitle}
          {log.sessionNr != null ? ` · Session ${log.sessionNr}` : ""}
        </p>

        <EditMissionLogForm
          userId={session.userId}
          log={log}
          isAdminOrGM={
            !!viewer && userCan(viewer, "content.autolink_tools", roleMap)
          }
        />

        <div className="mt-[16px]">
          <RevisionsPanel
            contentType="mission_log"
            contentId={log.id}
            path={`/user/mission-logs/${log.id}/edit`}
            revisions={revisions}
          />
        </div>
      </article>
    </>
  );
}
