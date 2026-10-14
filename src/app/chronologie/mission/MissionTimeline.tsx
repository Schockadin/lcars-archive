"use client";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import ChronoCard, { ChronoPanel } from "@/components/timeline/ChronoCard";
import ChronoRow from "@/components/timeline/ChronoRow";
import ContentCardMenu from "@/components/timeline/ContentCardMenu";
import {
  categoryVisual,
  ORIGIN_LABELS,
  type TimelineEvent,
} from "@/lib/timelineTypes";
import { groupMissionTimelineEntries } from "@/lib/missionTimeline";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { missionLogHref } from "@/lib/contentRoutes";
import type { MissionSynopsisBlock } from "@/lib/gameSessions";
import { groupSynopsisBlocksByDate } from "@/lib/sessionSynopsis";
import type { MissionLogListItem } from "@/types/missions";
import { DEFAULT_CROP, previewStyle } from "@/lib/portraitCrop";

export default function MissionTimeline({
  missionSlug,
  events,
  logs,
  dialogues,
  canCreateLog,
  fullSynopsisHtml,
  synopsisBlocks,
  currentUserId = null,
  help,
}: {
  missionSlug: string;
  events: TimelineEvent[];
  logs: MissionLogListItem[];
  dialogues: TimelineEvent[];
  canCreateLog: boolean;
  fullSynopsisHtml: string | null;
  synopsisBlocks: MissionSynopsisBlock[];
  currentUserId?: number | null;
  help?: ReactNode;
}) {
  const groups = useMemo(
    () => groupMissionTimelineEntries(events, logs, dialogues),
    [events, logs, dialogues],
  );
  const synopsisGroups = useMemo(
    () =>
      groupSynopsisBlocksByDate(synopsisBlocks)
        .map((group) => ({
          ...group,
          blocks: [...group.blocks].sort(
            (a, b) => a.missionBlockNumber - b.missionBlockNumber,
          ),
        }))
        .sort((a, b) => a.ingameDate.localeCompare(b.ingameDate)),
    [synopsisBlocks],
  );
  const hasSynopsis = synopsisBlocks.length > 0 || Boolean(fullSynopsisHtml);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="mission-timeline-overview">
      <div className="flex items-start justify-between gap-[12px]">
        <h2 className="lcars-data-row-heading">Missionschronik</h2>
        {help}
      </div>
      {canCreateLog && (
        <div className="lcars-toolbar mt-[16px]">
          <Link
            href={`/user/mission-logs/new?mission=${missionSlug}`}
            className="lcars-pill-btn"
          >
            Neues Log
          </Link>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="lcars-empty-state">
          Im Missionstext sind keine datierten Chronologie-Ereignisse erfasst.
        </p>
      ) : (
        <div className="mission-timeline-groups">
          {groups.map((group) => {
            const { event } = group;
            const visual = categoryVisual(event.category);
            const count = group.logs.length + group.dialogues.length;
            const expanded = openId === event.id;

            return (
              <ChronoRow key={event.id} date={event.date} color={visual.color}>
                <div className="mission-event-group">
                  <button
                    type="button"
                    className="timeline-card mission-event-trigger"
                    style={
                      {
                        "--timeline-color": visual.color,
                      } as React.CSSProperties
                    }
                    aria-expanded={expanded}
                    aria-controls={expanded ? `related-${event.id}` : undefined}
                    onClick={() => setOpenId(expanded ? null : event.id)}
                  >
                    {event.thumbnail && (
                      <span className="timeline-card-thumb-box">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="timeline-card-thumb"
                          style={previewStyle(
                            event.thumbnailCrop ?? DEFAULT_CROP,
                          )}
                          src={event.thumbnail}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                    )}
                    <span className="timeline-card-body">
                      <span className="timeline-card-head">
                        <span className="timeline-tag">{visual.label}</span>
                        <span className="timeline-card-title">
                          {event.title}
                        </span>
                        <span className="timeline-origin">
                          {ORIGIN_LABELS[event.origin]}
                        </span>
                      </span>
                      {event.detail && (
                        <span className="timeline-card-summary">
                          {event.detail}
                        </span>
                      )}
                      <span className="timeline-card-meta">
                        <span>
                          <b>Datum</b> {fmtDate(event.date)}
                        </span>
                        <span>
                          <b>Zugehörige Inhalte</b> {count}
                        </span>
                        <span className="mission-event-disclosure">
                          {expanded ? "Ausblenden" : "Anzeigen"}
                        </span>
                      </span>
                    </span>
                  </button>

                  {expanded && (
                    <div
                      id={`related-${event.id}`}
                      className="mission-event-related"
                    >
                      {count === 0 ? (
                        <p className="lcars-empty-state">
                          Keine Missions-Logs oder Gespräche mit diesem
                          Ingame-Datum.
                        </p>
                      ) : (
                        <>
                          {group.logs.length > 0 && (
                            <RelatedSection
                              title="Missions-Logs"
                              count={group.logs.length}
                            >
                              {group.logs.map((log) => (
                                <ChronoRow
                                  key={`log-${log.id}`}
                                  date={log.log_date}
                                  color={CONTENT_TYPE_COLOR.mission_log}
                                >
                                  <ChronoCard
                                    color={CONTENT_TYPE_COLOR.mission_log}
                                    tag="Logbuch"
                                    title={log.title}
                                    href={missionLogHref(missionSlug, log.slug)}
                                    ariaLabel={`${log.title} — Logbuch`}
                                    date={fmtDate(log.log_date) || undefined}
                                    meta={
                                      <span>
                                        <b>Session</b>{" "}
                                        {sessionLabel(log.session_nr)}
                                        {log.author_name && (
                                          <>
                                            {" "}
                                            · <b>Autor</b> {log.author_name}
                                          </>
                                        )}
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
                                        href={missionLogHref(
                                          missionSlug,
                                          log.slug,
                                        )}
                                      />
                                    }
                                  />
                                </ChronoRow>
                              ))}
                            </RelatedSection>
                          )}

                          {group.dialogues.length > 0 && (
                            <RelatedSection
                              title="Gespräche"
                              count={group.dialogues.length}
                            >
                              {group.dialogues.map((dialogue) => (
                                <ChronoRow
                                  key={dialogue.id}
                                  date={dialogue.date}
                                  color={CONTENT_TYPE_COLOR.dialogue}
                                >
                                  <ChronoCard
                                    color={CONTENT_TYPE_COLOR.dialogue}
                                    tag="Gespräch"
                                    title={dialogue.title}
                                    href={dialogue.href ?? undefined}
                                    ariaLabel={`${dialogue.title} — Gespräch`}
                                    date={fmtDate(dialogue.date) || undefined}
                                    meta={
                                      dialogue.people.length > 0 ? (
                                        <span>
                                          <b>Beteiligt</b>{" "}
                                          {dialogue.people.join(" · ")}
                                        </span>
                                      ) : undefined
                                    }
                                  >
                                    {dialogue.detail && (
                                      <ChronoPanel label="Teaser" open>
                                        {dialogue.detail}
                                      </ChronoPanel>
                                    )}
                                  </ChronoCard>
                                </ChronoRow>
                              ))}
                            </RelatedSection>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </ChronoRow>
            );
          })}
        </div>
      )}

      {hasSynopsis && (
        <section
          id="mission-full-synopsis"
          className="mission-full-synopsis scroll-mt-24"
        >
          <h3 className="lcars-data-row-heading">Synopsis</h3>
          {synopsisBlocks.length > 0 ? (
            <div className="mission-body">
              {synopsisGroups.map((group) => (
                <section key={group.ingameDate}>
                  <h4>{fmtDate(group.ingameDate)}</h4>
                  {group.blocks.map((block) => (
                    <div
                      key={block.id}
                      dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
                    />
                  ))}
                </section>
              ))}
            </div>
          ) : (
            <div
              className="mission-body"
              dangerouslySetInnerHTML={{ __html: fullSynopsisHtml ?? "" }}
            />
          )}
        </section>
      )}
    </section>
  );
}

function RelatedSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mission-related-section">
      <h3 className="timeline-period">
        {title} · {count}
      </h3>
      {children}
    </section>
  );
}
