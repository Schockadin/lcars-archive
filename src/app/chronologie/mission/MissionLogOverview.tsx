"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LcarsSortSwitch, type SortDir } from "@/components/lcars";
import ChronoRow from "@/components/timeline/ChronoRow";
import ChronoCard from "@/components/timeline/ChronoCard";
import { MissionLogListItem } from "@/types/missions";
import { byDateAsc, byDateDesc, fmtDate, sessionLabel } from "@/lib/missionFormat";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { missionLogHref } from "@/lib/contentRoutes";

type LogSortMode = "date" | "author";

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
  canCreateLog,
}: {
  missionSlug: string;
  logs: MissionLogListItem[];
  canCreateLog: boolean;
}) {
  // Vorgabe: nach Autor gruppiert — innerhalb einer Mission ist „wer hat
  // geschrieben" die nützlichere Ordnung als die reine Chronologie.
  const [sort, setSort] = useState<LogSortMode>("author");
  const [dateDir, setDateDir] = useState<SortDir>("desc");

  const dateView = useMemo(
    () => [...logs].sort(dateDir === "desc" ? byDateDesc : byDateAsc),
    [logs, dateDir],
  );

  // Autor-Gruppen sortieren intern immer absteigend; die Datum-Ansicht folgt
  // der gewählten Richtung.
  const authorGroups = useMemo(() => {
    const sorted = [...logs].sort(byDateDesc);
    const map = new Map<string, { name: string; logs: MissionLogListItem[] }>();
    for (const log of sorted) {
      const key = log.author_slug ?? log.author_name ?? "none";
      let group = map.get(key);
      if (!group) {
        group = { name: log.author_name ?? "Unbekannt", logs: [] };
        map.set(key, group);
      }
      group.logs.push(log);
    }
    return [...map.values()];
  }, [logs]);

  return (
    <section className="mission-log-overview lcars-wide-column">
      <h2 className="lcars-data-row-heading">Logbücher</h2>
      <p className="lcars-eyebrow">
        {logs.length === 1 ? "1 Logbuch" : `${logs.length} Logbücher`}
        {logs.length > 0 &&
          ` · ${
            sort === "author"
              ? "nach Autor gruppiert"
              : dateDir === "desc"
                ? "neueste zuerst"
                : "älteste zuerst"
          }`}
      </p>

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
          {logs.length > 0 && (
            <LcarsSortSwitch
              className="mission-sort"
              options={[
                { key: "date", label: "Datum" },
                { key: "author", label: "Autor", sortable: false },
              ]}
              sortKey={sort}
              sortDir={dateDir}
              onChange={(key, dir) => {
                setSort(key);
                setDateDir(dir);
              }}
            />
          )}
        </div>
      )}

      {logs.length === 0 ? (
        <p className="lcars-empty-state">
          Keine Logs zu dieser Mission erfasst.
        </p>
      ) : sort === "date" ? (
        <div>
          {dateView.map((log) => (
            <LogRow key={log.id} log={log} missionSlug={missionSlug} withAuthor />
          ))}
        </div>
      ) : (
        authorGroups.map((group) => (
          <div key={group.name}>
            <h3 className="timeline-period">
              {group.name} · {group.logs.length}
            </h3>
            {group.logs.map((log) => (
              <LogRow key={log.id} log={log} missionSlug={missionSlug} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}

// Eine Zeile der Übersicht. `withAuthor` nur in der Datums-Ansicht — in der
// Autor-Gruppierung steht der Name schon in der Gruppenüberschrift.
function LogRow({
  log,
  missionSlug,
  withAuthor = false,
}: {
  log: MissionLogListItem;
  missionSlug: string;
  withAuthor?: boolean;
}) {
  return (
    <ChronoRow date={log.log_date} color={CONTENT_TYPE_COLOR.mission_log}>
      <ChronoCard
        color={CONTENT_TYPE_COLOR.mission_log}
        tag={sessionLabel(log.session_nr)}
        title={log.title}
        href={missionLogHref(missionSlug, log.slug)}
        ariaLabel={`${log.title} — Logbuch`}
        date={fmtDate(log.log_date) || undefined}
        meta={
          withAuthor && log.author_name ? (
            <span>
              <b>Autor</b> {log.author_name}
            </span>
          ) : undefined
        }
      />
    </ChronoRow>
  );
}
