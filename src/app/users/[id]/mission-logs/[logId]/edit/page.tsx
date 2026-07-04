import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession } from "@/lib/dal";
import { getOwnMissionLogForEdit } from "@/lib/missions";
import EditMissionLogForm from "./EditMissionLogForm";

export const metadata: Metadata = {
  title: "Missionslog bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditMissionLogPage({
  params,
}: {
  params: Promise<{ id: string; logId: string }>;
}) {
  const { id, logId } = await params;
  const session = await verifySession();

  const userId = Number(id);
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const log = await getOwnMissionLogForEdit(session.userId, Number(logId));
  if (!log) {
    redirect(`/users/${session.userId}/content`);
  }

  return (
    <>
      <PageMeta title="Missionslog bearbeiten" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Missionslog bearbeiten</h1>
        <p className="lcars-text text-[13px] opacity-80">
          {log.authorName} · {log.missionTitle}
          {log.sessionNr != null ? ` · Session ${log.sessionNr}` : ""}
        </p>

        <EditMissionLogForm userId={userId} log={log} />
      </article>
    </>
  );
}
