import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import MissionSynopsis from "../MissionSynopsis";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ missionSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) return { title: "Nicht gefunden" };

  const desc = mission.summary ?? stripHtml(mission.metadata.body ?? "");
  return {
    title: mission.title,
    description: desc.slice(0, 160) || undefined,
  };
}

export default async function MissionPage({ params }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) notFound();

  return <MissionSynopsis mission={mission} />;
}
