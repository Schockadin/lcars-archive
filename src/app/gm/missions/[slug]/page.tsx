import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import {
  listActiveCharactersForAp,
  listAssignableLogbooks,
  listGameSessions,
  listMissionSynopsisBlocks,
  listSessionMissions,
} from "@/lib/gameSessions";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { getMissionBySlug } from "@/lib/missions";
import { listAllPlannedSessions } from "@/lib/plannedSessions";
import { STATUS_CONFIG, periodLabel } from "@/lib/missionFormat";
import { missionEditHref, missionHref } from "@/lib/contentRoutes";
import SessionManager from "../../sessions/SessionManager";
import PlannedSessionManager from "../../sessions/PlannedSessionManager";
import MissionSummaryBlocks from "./MissionSummaryBlocks";

export const metadata: Metadata = {
  title: "Mission bearbeiten",
  robots: { index: false, follow: false },
};

export default async function GmMissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireGM();
  const { slug } = await params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();

  const [
    allSessions,
    allPlannedSessions,
    characters,
    logbooks,
    rules,
    missions,
    summaryBlocks,
  ] = await Promise.all([
      listGameSessions(),
      listAllPlannedSessions(),
      listActiveCharactersForAp(),
      listAssignableLogbooks(),
      getAdvancementRules(),
      listSessionMissions(),
      listMissionSynopsisBlocks(mission.id),
    ]);

  const sessions = allSessions.filter((session) => session.missionId === mission.id);
  const plannedSessions = allPlannedSessions.filter(
    (session) => session.missionId === mission.id,
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());

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
            <Link href={missionEditHref(mission.id)} className="lcars-pill-btn">
              Mission bearbeiten
            </Link>
          </div>
        </div>

        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>{mission.title}</h1>
        <p className="mb-[20px] text-lcars-ink-dim text-[13px]">
          {STATUS_CONFIG[mission.status].label} · {periodLabel(mission.started_at, mission.ended_at)}
          {mission.isDraft && " · Entwurf"}
          {" · "}{plannedSessions.length + sessions.length} zugehörige {plannedSessions.length + sessions.length === 1 ? "Session" : "Sessions"}
        </p>

        <div className="lcars-text flex flex-col gap-[28px]">
          <PlannedSessionManager
            sessions={plannedSessions}
            characters={characters}
            missions={missions}
            defaultSessionAp={rules.apPerSession}
            showCreateForm={false}
          />

          <MissionSummaryBlocks
            missionTitle={mission.title}
            blocks={summaryBlocks}
          />

          <section className="flex flex-col gap-[12px]">
            <div>
              <h2 className="text-lcars-primary-ink">Sessions</h2>
              <p className="text-lcars-ink-dim text-[13px]">
                Sessiondaten und Summary-Blöcke lassen sich durch Aufklappen
                des jeweiligen Eintrags bearbeiten.
              </p>
            </div>
            <SessionManager
              sessions={sessions}
              characters={characters}
              missions={missions}
              logbooks={logbooks}
              defaultSessionAp={rules.apPerSession}
              apPerLogbook={rules.apPerLogbook}
              today={today}
              showCreateForm={false}
              sessionsHeading="Gespielte Sessions"
            />
          </section>
        </div>
      </article>
    </>
  );
}
