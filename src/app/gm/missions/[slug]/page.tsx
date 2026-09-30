import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import { getMissionParticipantIds } from "@/lib/missions";
import { listRevisions } from "@/lib/contentRevisions";
import { getViewer } from "@/lib/visibility";
import {
  listGameSessions,
  listMissionSynopsisBlocks,
} from "@/lib/gameSessions";
import { getMissionBySlug } from "@/lib/missions";
import { STATUS_CONFIG, periodLabel } from "@/lib/missionFormat";
import { missionHref } from "@/lib/contentRoutes";
import { PencilIcon } from "@/lib/icons";
import SessionsBrowser from "../../sessions/SessionsBrowser";
import MissionSummaryBlocks from "./MissionSummaryBlocks";
import MissionContentEditor from "./MissionContentEditor";
import RevisionsPanel from "@/app/_shared/RevisionsPanel";
import HelpButton from "@/components/help/HelpButton";
import { GmMissionDetailGuide } from "@/components/help/guides/GmGuides";

export const metadata: Metadata = {
  title: "Mission bearbeiten",
  robots: { index: false, follow: false },
};

export default async function GmMissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireGM();
  const { slug } = await params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();

  const [
    allSessions,
    summaryBlocks,
    participantIds,
    revisions,
    participantOptions,
  ] = await Promise.all([
      listGameSessions(),
      listMissionSynopsisBlocks(mission.id),
      getMissionParticipantIds(mission.id),
      getViewer().then((viewer) => listRevisions("mission", mission.id, viewer)),
      getCharactersForParticipantPicker(),
    ]);

  const sessions = allSessions.filter((session) => session.missionId === mission.id);

  return (
    <>
      <PageMeta title={mission.title} section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <div className="mb-[12px] flex flex-wrap items-center justify-between gap-[10px]">
          <Link href="/gm/missions" className="lcars-back-link">
            ‹ Missionen
          </Link>
          <div className="flex flex-wrap gap-[8px]">
            <Link href={missionHref(mission.slug)} className="lcars-pill-btn--outline">
              Mission ansehen
            </Link>
            <HelpButton title="Leitung · Mission bearbeiten" tutorial="spielleitung-admins">
              <GmMissionDetailGuide />
            </HelpButton>
            <a href="#mission-editor" className="lcars-icon-btn" aria-label="Mission bearbeiten" title="Mission bearbeiten"><PencilIcon /></a>
          </div>
        </div>

        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>{mission.title}</h1>
        <p className="mb-[20px] text-lcars-ink-dim text-[13px]">
          {STATUS_CONFIG[mission.status].label} · {periodLabel(mission.started_at, mission.ended_at)}
          {mission.isDraft && " · Entwurf"}
          {" · "}{sessions.length} zugehörige {sessions.length === 1 ? "Session" : "Sessions"}
        </p>

        <div className="lcars-text flex flex-col gap-[28px]">
          <SessionsBrowser sessions={sessions} heading="Sessions" groupByMission={false} />
          {summaryBlocks.some((block) => block.sessionId === null) && <MissionSummaryBlocks
            missionSlug={mission.slug} missionTitle={mission.title}
            blocks={summaryBlocks.filter((block) => block.sessionId === null)} />}
          <section id="mission-editor" className="scroll-mt-24 flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Mission bearbeiten</h2>
            <MissionContentEditor mission={mission} userId={user.id} characters={participantOptions} participantIds={participantIds} />
            <RevisionsPanel contentType="mission" contentId={mission.id} path={`/gm/missions/${encodeURIComponent(mission.slug)}`} revisions={revisions} />
          </section>
        </div>
      </article>
    </>
  );
}
