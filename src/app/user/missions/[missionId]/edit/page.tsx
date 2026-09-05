import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnGM } from "../../../dal";
import { getMissionById, getMissionParticipantIds } from "@/lib/missions";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import EditMissionForm from "./EditMissionForm";
import RevisionsPanel from "@/app/_shared/RevisionsPanel";
import { listRevisions } from "@/lib/contentRevisions";
import { getViewer } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Mission bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditMissionPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const { user } = await requireOwnGM();

  const mission = await getMissionById(Number(missionId));
  if (!mission) notFound();

  const [characters, participantIds, revisions] = await Promise.all([
    getCharactersForParticipantPicker(),
    getMissionParticipantIds(mission.id),
    getViewer().then((viewer) => listRevisions("mission", mission.id, viewer)),
  ]);

  return (
    <>
      <PageMeta title="Mission bearbeiten" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <h1>Mission bearbeiten</h1>
        <EditMissionForm
          userId={user.id}
          mission={mission}
          characters={characters}
          participantIds={participantIds}
        />

        <div className="mt-[16px]">
          <RevisionsPanel
            contentType="mission"
            contentId={mission.id}
            path={`/user/missions/${mission.id}/edit`}
            revisions={revisions}
          />
        </div>
      </article>
    </>
  );
}
