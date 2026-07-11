import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession } from "@/lib/dal";
import { getOwnMissionLogForEdit } from "@/lib/missions";
import { getUserById } from "@/lib/users";
import EditMissionLogForm from "./EditMissionLogForm";

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

  const [log, viewer] = await Promise.all([
    getOwnMissionLogForEdit(session.userId, Number(logId)),
    getUserById(session.userId),
  ]);
  if (!log) {
    redirect("/user/content");
  }

  return (
    <>
      <PageMeta title="Missionslog bearbeiten" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Missionslog bearbeiten</h1>
        <p className="lcars-text text-[13px] opacity-80">
          {log.authorName} · {log.missionTitle}
          {log.sessionNr != null ? ` · Session ${log.sessionNr}` : ""}
        </p>

        <EditMissionLogForm
          userId={session.userId}
          log={log}
          isAdminOrGM={viewer?.role === "gm" || viewer?.role === "admin"}
        />
      </article>
    </>
  );
}
