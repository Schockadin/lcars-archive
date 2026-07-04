import { notFound } from "next/navigation";
import { getAllMissions, getMissionBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import { getViewer } from "@/lib/visibility";
import { listAllUsers } from "@/lib/users";
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

// Missionen haben keine eigene Sichtbarkeits-Sperre (immer öffentlich
// lesbar), waren deshalb bisher die einzige der vier Inhalts-Detailseiten
// mit echtem SSG. Der Admin-Owner-Block unten braucht aber getViewer()
// (cookies()) auf JEDER Anfrage, um die Rolle zu kennen — das erzwingt
// force-dynamic, exakt der bereits akzeptierte Trade-off bei
// Charakteren/Logs/Archiv-Einträgen (siehe deren page.tsx-Kommentare).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) return { title: "Nicht gefunden" };

  return {
    title: mission.title,
    description: mission.metadata.body
      ? stripHtml(mission.metadata.body).slice(0, 160)
      : undefined,
  };
}

export default async function MissionPage({ params }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) notFound();

  const viewer = await getViewer();
  const owners = viewer?.role === "admin" ? await listAllUsers() : [];

  return (
    <>
      <MissionSynopsis mission={mission} owners={owners} viewer={viewer} />
    </>
  );
}
