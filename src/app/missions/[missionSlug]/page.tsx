import { notFound, redirect } from "next/navigation";
import { getAllMissions, getMissionBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import { getViewer, canViewMissionDraft } from "@/lib/visibility";
import { setSubscription } from "@/lib/follows";
import { listAllUsers } from "@/lib/users";
import MissionSynopsis from "../MissionSynopsis";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
interface Props {
  params: Promise<{ missionSlug: string }>;
  searchParams: Promise<{ activateFollow?: string }>;
}

// Bekannte Missionen zur Build-Zeit vorrendern. Neue Slugs werden beim ersten
// Aufruf on-demand erzeugt (dynamicParams = true ist der Default).
export async function generateStaticParams() {
  const missions = await getAllMissions();
  return missions.map((mission) => ({ missionSlug: mission.slug }));
}

// Missionen sind immer öffentlich lesbar. Der Admin-Owner-Block braucht
// getViewer() (cookies()) — unter Cache Components läuft dieser Teil in einer
// Suspense-Insel, der öffentliche Inhalt kann statische Shell werden.
// force-dynamic entfällt (mit cacheComponents unzulässig).

export async function generateMetadata({ params }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission || !canViewMissionDraft(mission.isDraft, await getViewer())) {
    return { title: "Nicht gefunden" };
  }

  return {
    title: mission.title,
    description: mission.metadata.body
      ? stripHtml(mission.metadata.body).slice(0, 160)
      : undefined,
  };
}

export default async function MissionPage({ params, searchParams }: Props) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) notFound();

  const viewer = await getViewer();
  if (!canViewMissionDraft(mission.isDraft, viewer)) notFound();

  // Aktivierungslink aus der Teilnehmer-Benachrichtigung (missionAction,
  // src/app/user/missions/_shared/contentAction.ts) — die Mission wird
  // beim Anlegen bewusst NICHT automatisch abonniert, dieser Link holt das
  // mit einem Klick nach. Nur wirksam, wenn der Link in einer bereits
  // eingeloggten Session geöffnet wird; sonst einfach ein no-op (der Follow-
  // Button bleibt weiterhin manuell nutzbar). Redirect auf die sauberen URL
  // danach, damit ein Reload/Zurück nicht erneut (de-)abonniert.
  const { activateFollow } = await searchParams;
  if (activateFollow && viewer) {
    await setSubscription(viewer.userId, "mission", missionSlug, true);
    redirect(`/missions/${missionSlug}`);
  }

  const allUsers = viewer?.role === "admin" ? await listAllUsers() : [];
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <MarkNewsSeen type="mission" slug={mission.slug} />
      <MissionSynopsis mission={mission} owners={owners} viewer={viewer} />
    </>
  );
}
