"use client";
import Link from "next/link";
import ChronoRow from "@/components/timeline/ChronoRow";
import ChronoCard from "@/components/timeline/ChronoCard";
import { MissionLogListItem } from "@/types/missions";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { missionLogHref } from "@/lib/contentRoutes";
import type { MissionSynopsisBlock } from "@/lib/gameSessions";
import { LcarsCollapsiblePanel, LcarsToc } from "@/components/lcars";
import ContentCardMenu from "@/components/timeline/ContentCardMenu";

// Die Übersicht der Logbücher INNERHALB einer Mission — dieselbe Liste wie
// die Chronologie und die Datenbank: ChronoRow (Datumsspalte · Schiene mit
// Punkt · Karte) mit ChronoCard darin.
//
// Vorher war das eine 320px schmale, mitscrollende Schiene neben dem Text
// (Master-Detail). Die Zeilen darin (LcarsLogEntry) waren als einzige
// Übersicht der App nie auf das gemeinsame Listen-System gezogen worden.
// LcarsLogEntry bleibt bestehen: die Charakter-Log-Liste nutzt sie weiter.
export default function MissionLogOverview({
  missionSlug,
  missionTitle: _missionTitle,
  fullSynopsisHtml,
  logs,
  synopsisBlocks,
  canCreateLog,
  currentUserId = null,
}: {
  missionSlug: string;
  missionTitle: string;
  fullSynopsisHtml: string | null;
  logs: MissionLogListItem[];
  synopsisBlocks: MissionSynopsisBlock[];
  canCreateLog: boolean;
  currentUserId?: number | null;
}) {
  const entries = [
    ...logs.map((log) => ({ kind: "log" as const, date: log.log_date ?? "", log })),
    ...synopsisBlocks.map((block) => ({ kind: "synopsis" as const, date: block.ingameDate, block })),
  ].sort((a, b) => b.date.localeCompare(a.date) || (a.kind === b.kind ? 0 : a.kind === "log" ? -1 : 1));

  return (
    <section className="mission-log-overview">
      <h2 className="lcars-data-row-heading">Missionschronik</h2>
      <p className="lcars-eyebrow">
        {logs.length} {logs.length === 1 ? "Log" : "Logs"} · {synopsisBlocks.length} {synopsisBlocks.length === 1 ? "Session-Block" : "Session-Blöcke"} · chronologisch
      </p>

      {(synopsisBlocks.length > 0 || fullSynopsisHtml) && (
        <div className="mb-[16px]">
          <LcarsCollapsiblePanel
            title="Inhaltsverzeichnis"
            storageId={`mission:${missionSlug}:chronicle-toc`}
          >
            <LcarsToc
              title="Sessions"
              ariaLabel="Inhaltsverzeichnis der Missionschronik"
              headings={[
                ...synopsisBlocks.map((block) => ({
                  id: `mission-synopsis-${block.id}`,
                  text: fmtDate(block.ingameDate),
                })),
                ...(fullSynopsisHtml
                  ? [{ id: "mission-full-synopsis", text: "Synopsis" }]
                  : []),
              ]}
            />
          </LcarsCollapsiblePanel>
        </div>
      )}

      {(canCreateLog || logs.length > 0) && (
        <div className="lcars-toolbar mt-[16px]">
          {canCreateLog && (
            <Link
              href={`/user/mission-logs/new?mission=${missionSlug}`}
              className="lcars-pill-btn"
            >
              Neues Log
            </Link>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="lcars-empty-state">
          Noch keine Logs oder Session-Einträge vorhanden.
        </p>
      ) : (
        <div>
          {entries.map((entry) => {
            if (entry.kind === "log") {
              return (
                <LogRow
                  key={`log-${entry.log.id}`}
                  log={entry.log}
                  missionSlug={missionSlug}
                  currentUserId={currentUserId}
                />
              );
            }
            return (
              <div key={`synopsis-${entry.block.id}`} id={`mission-synopsis-${entry.block.id}`} className="scroll-mt-24">
                <ChronoRow
                  date={entry.block.ingameDate}
                  color={CONTENT_TYPE_COLOR.mission}
                >
                  <ChronoCard
                    color={CONTENT_TYPE_COLOR.mission}
                    tag="Session"
                    title={fmtDate(entry.block.ingameDate)}
                    date={fmtDate(entry.block.ingameDate)}
                  >
                    <div
                      className="mission-body"
                      dangerouslySetInnerHTML={{ __html: entry.block.bodyHtml }}
                    />
                  </ChronoCard>
                </ChronoRow>
              </div>
            );
          })}
        </div>
      )}

      {fullSynopsisHtml && (
        <section id="mission-full-synopsis" className="mission-full-synopsis scroll-mt-24">
          <h3 className="lcars-data-row-heading">Synopsis</h3>
          <div
            className="mission-body"
            dangerouslySetInnerHTML={{ __html: fullSynopsisHtml }}
          />
        </section>
      )}
    </section>
  );
}

// Eine Log-Zeile in der chronologischen Missionsübersicht.
function LogRow({
  log,
  missionSlug,
  currentUserId,
}: {
  log: MissionLogListItem;
  missionSlug: string;
  currentUserId: number | null;
}) {
  return (
    <ChronoRow date={log.log_date} color={CONTENT_TYPE_COLOR.mission_log}>
      <ChronoCard
        color={CONTENT_TYPE_COLOR.mission_log}
        tag="Log"
        title={log.title}
        href={missionLogHref(missionSlug, log.slug)}
        ariaLabel={`${log.title} — Logbuch`}
        date={fmtDate(log.log_date) || undefined}
        meta={
          <span>
            <b>Session</b> {sessionLabel(log.session_nr)}
            {log.author_name && <> · <b>Autor</b> {log.author_name}</>}
          </span>
        }
        actions={
          <ContentCardMenu
            contentType="mission_log"
            id={log.id}
            ownerUserId={log.ownerUserId}
            currentUserId={currentUserId}
            isDraft={log.isDraft}
            title={log.title}
            href={missionLogHref(missionSlug, log.slug)}
          />
        }
      />
    </ChronoRow>
  );
}
