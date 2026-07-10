import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnGM } from "../../../dal";
import { getMissionById } from "@/lib/missions";
import EditMissionForm from "./EditMissionForm";

export const metadata: Metadata = {
  title: "Mission bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditMissionPage({
  params,
}: {
  params: Promise<{ id: string; missionId: string }>;
}) {
  const { id, missionId } = await params;
  await requireOwnGM(id);

  const mission = await getMissionById(Number(missionId));
  if (!mission) notFound();

  return (
    <>
      <PageMeta title="Mission bearbeiten" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Mission bearbeiten</h1>
        <EditMissionForm userId={Number(id)} mission={mission} />
      </article>
    </>
  );
}
