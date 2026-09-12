import { notFound, redirect } from "next/navigation";
import {
  getLogsByMissionId,
  getMissionBySlug,
  getMissionParticipantIds,
} from "@/lib/missions";
import { getCharactersForUser } from "@/lib/characters";
import { stripHtml } from "@/lib/missionFormat";
import {
  getViewer,
  canViewMissionDraft,
  viewerHasPermission,
} from "@/lib/visibility";
import { setSubscription, resolveFollowState } from "@/lib/follows";
import { listAllUsers } from "@/lib/users";
import MissionSynopsis from "../MissionSynopsis";
import MissionLogOverview from "../MissionLogOverview";
import PageMeta from "@/components/PageMeta";
import { getMentionsOf } from "@/lib/mentions";
import MentionsSection from "@/app/_shared/MentionsSection";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
import { listNotes } from "@/lib/contentNotes";
import NotesPanel from "@/app/_shared/NotesPanel";
import MissionBookLink from "./MissionBookLink";
import { missionHref } from "@/lib/contentRoutes";
interface Props {
  params: Promise<{ missionSlug: string }>;
  searchParams: Promise<{ activateFollow?: string }>;
}


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
    redirect(missionHref(missionSlug));
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
  const [allUsers, followInitialState, mentions, notes, logs] =
    await Promise.all([
      canReassignOwner ? listAllUsers() : Promise.resolve([]),
      resolveFollowState(viewer?.userId ?? null, "mission", missionSlug),
      // Wer verweist auf diese Mission? (Archiv-Verweisfelder + Wikilinks)
      getMentionsOf({ slug: mission.slug, name: mission.title }, viewer),
      listNotes("mission", mission.slug, viewer),
      // Die Logbücher dieser Mission — bis zum Redesign lagen sie im Layout,
      // das die schmale Navigationsschiene daneben gerendert hat.
      getLogsByMissionId(mission.id),
    ]);
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  // „Neues Log" nur für Betrachter, die mit einem eigenen Charakter an DIESER
  // Mission teilnehmen (mission_participants) — nicht schon bei irgendeinem
  // eigenen Charakter, da der Knopf auf genau diese Mission verlinkt.
  const [characters, participantIds] = viewer
    ? await Promise.all([
        getCharactersForUser(viewer.userId),
        getMissionParticipantIds(mission.id),
      ])
    : [[], []];
  const canCreateLog = characters.some((c) => participantIds.includes(c.id));

  return (
    <>
      <PageMeta title={mission.title} section="chronologie" />
      <MarkNewsSeen type="mission" slug={mission.slug} />
      <MissionSynopsis
        mission={mission}
        owners={owners}
        viewer={viewer}
        followInitialState={followInitialState}
      />
      <MissionLogOverview
        missionSlug={mission.slug}
        logs={logs}
        canCreateLog={canCreateLog}
      />

      <div className="lcars-text lcars-wide-column mt-[16px] flex flex-col gap-[16px]">
        {/* Die Akte dieser Mission als PDF — nur für Angemeldete, die Route
            weist Gäste ohnehin ab (ein Link zur Anmeldung wäre eine
            Sackgasse). Ohne eigene Suspense-Grenze: die Seite ist durch das
            getViewer() oben ohnehin betrachterabhängig. */}
        {viewer && (
          <div className="flex flex-wrap gap-[8px]">
            <MissionBookLink missionSlug={mission.slug} />
          </div>
        )}
        {viewer && (
          <NotesPanel
            contentType="mission"
            contentSlug={mission.slug}
            path={missionHref(mission.slug)}
            notes={notes}
          />
        )}
        <MentionsSection mentions={mentions} />
      </div>
    </>
  );
}
