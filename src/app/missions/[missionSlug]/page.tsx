import { notFound, redirect } from "next/navigation";
import { getMissionBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import {
  getViewer,
  canViewMissionDraft,
  viewerHasPermission,
} from "@/lib/visibility";
import { setSubscription, resolveFollowState } from "@/lib/follows";
import { listAllUsers } from "@/lib/users";
import MissionSynopsis from "../MissionSynopsis";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
interface Props {
  params: Promise<{ missionSlug: string }>;
  searchParams: Promise<{ activateFollow?: string }>;
}

// Missionen haben keine eigene Sichtbarkeits-Sperre (immer öffentlich
// lesbar). Der Admin-Owner-Block unten braucht aber getViewer() (cookies())
// auf JEDER Anfrage, um die Rolle zu kennen — das erzwingt force-dynamic,
// exakt der bereits akzeptierte Trade-off bei Charakteren/Logs/Archiv-
// Einträgen (siehe deren page.tsx-Kommentare). Ein generateStaticParams wäre
// unter force-dynamic ohnehin toter Code (nie zur Build-Zeit ausgeführt) —
// deshalb bewusst weggelassen.
export const dynamic = "force-dynamic";

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
  // Mission und Betrachter sind voneinander unabhängig — parallel laden statt
  // nacheinander (getViewer liest nur Cookies/Session, nicht die Mission).
  const [mission, viewer] = await Promise.all([
    getMissionBySlug(missionSlug),
    getViewer(),
  ]);
  if (!mission) notFound();
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

  // Owner-Auswahl nur laden, wenn der Betrachter die Mission tatsächlich
  // umtragen darf — exakt das Server-Gate von setOwnerAction für Missionen
  // (content.moderate ODER missions.manage), rechte- statt rollenbasiert
  // (früher hart role === "admin", was Multi-Rollen-/Override-Berechtigte und
  // GMs mit missions.manage fälschlich ausschloss).
  const canReassignOwner =
    viewerHasPermission(viewer, "content.moderate") ||
    viewerHasPermission(viewer, "missions.manage");
  // Owner-Liste (optional) und Follow-Stand parallel. followInitialState wird
  // an FollowButtons durchgereicht, damit Bookmark/Abo sofort mitgerendert
  // werden statt sie nach der Hydration per Client-Fetch nachzuladen.
  const [allUsers, followInitialState] = await Promise.all([
    canReassignOwner ? listAllUsers() : Promise.resolve([]),
    resolveFollowState(viewer?.userId ?? null, "mission", missionSlug),
  ]);
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <MarkNewsSeen type="mission" slug={mission.slug} />
      <MissionSynopsis
        mission={mission}
        owners={owners}
        viewer={viewer}
        followInitialState={followInitialState}
      />
    </>
  );
}
