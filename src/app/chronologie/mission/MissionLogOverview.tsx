"use client";
import Link from "next/link";
import ChronoRow from "@/components/timeline/ChronoRow";
import ChronoCard from "@/components/timeline/ChronoCard";
import { MissionLogListItem } from "@/types/missions";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { missionLogHref } from "@/lib/contentRoutes";
import type { MissionSynopsisBlock } from "@/lib/gameSessions";

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
  logs,
  synopsisBlocks,
  canCreateLog,
}: {
  missionSlug: string;
  logs: MissionLogListItem[];
  synopsisBlocks: MissionSynopsisBlock[];
  canCreateLog: boolean;
}) {
  const entries = [
    ...logs.map((log) => ({ kind: "log" as const, date: log.log_date ?? "", log })),
    ...synopsisBlocks.map((block) => ({ kind: "synopsis" as const, date: block.ingameDate, block })),
  ].sort((a, b) => b.date.localeCompare(a.date) || (a.kind === b.kind ? 0 : a.kind === "log" ? -1 : 1));

  return (
    <section className="mission-log-overview">
      <h2 className="lcars-data-row-heading">Missionschronik</h2>
      <p className="lcars-eyebrow">
        {logs.length} {logs.length === 1 ? "Log" : "Logs"} · {synopsisBlocks.length} {synopsisBlocks.length === 1 ? "Synopsis-Block" : "Synopsis-Blöcke"} · chronologisch
      </p>

      {synopsisBlocks.length > 0 && (
        <nav aria-label="Sprungmarken zu Sessions" className="mt-[12px] flex flex-wrap gap-x-[14px] gap-y-[6px]">
          {synopsisBlocks.map((block) => (
            <a key={block.id} href={`#mission-synopsis-${block.id}`} className="text-[13px] underline underline-offset-2">
              {block.sessionTitle ?? "Session"} · {fmtDate(block.ingameDate)}
              {block.endDate ? `–${fmtDate(block.endDate)}` : ""}
            </a>
          ))}
        </nav>
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
          Noch keine Logs oder Synopsis-Einträge vorhanden.
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
                    tag="Synopsis"
                    title={entry.block.sessionTitle ?? "Session-Zusammenfassung"}
                    date={`${fmtDate(entry.block.ingameDate)}${entry.block.endDate ? `–${fmtDate(entry.block.endDate)}` : ""}`}
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
    </section>
  );
}

// Eine Log-Zeile in der chronologischen Missionsübersicht.
function LogRow({
  log,
  missionSlug,
}: {
  log: MissionLogListItem;
  missionSlug: string;
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
      />
    </ChronoRow>
  );
}
