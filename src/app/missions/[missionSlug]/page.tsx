import { notFound } from "next/navigation";
import { getAllMissions, getMissionBySlug } from "@/lib/missions";
import MissionSynopsis from "../MissionSynopsis";

interface Props {
  params: Promise<{ missionSlug: string }>;
}

// Bekannte Missionen zur Build-Zeit vorrendern. Neue Slugs werden beim ersten
// Aufruf on-demand erzeugt (dynamicParams = true ist der Default).
export async function generateStaticParams() {
  const missions = await getAllMissions();
  return missions.map((mission) => ({ missionSlug: mission.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) return { title: "Nicht gefunden" };

  return {
    title: mission.title,
    description: mission.synopsis?.slice(0, 160) || undefined,
  };
}

export default async function MissionPage({ params }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) notFound();

  return <MissionSynopsis mission={mission} />;
}
