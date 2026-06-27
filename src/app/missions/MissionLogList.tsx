"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LcarsDataRow } from "@/components/lcars";
import { MissionLogListItem } from "@/types/missions";
import {
  AUTHOR_COLORS,
  byDateDesc,
  fmtDate,
  sessionLabel,
} from "@/lib/missionFormat";

type LogSortMode = "date" | "author";

// Linke, persistente Log-Liste der Mission-Detailseite. Sortierbar nach
// Datum (flach, Autor in der Zeile) oder Autor (gruppiert, je Gruppe Datum
// absteigend). Das aktive Log wird aus dem Pfad ermittelt.
export default function MissionLogList({
  missionSlug,
  summary,
  logs,
}: {
  missionSlug: string;
  summary: string | null;
  logs: MissionLogListItem[];
}) {
  const [sort, setSort] = useState<LogSortMode>("author");
  const pathname = usePathname();

  // Aktives Log = drittes Pfadsegment unter /missions/[mission]/[log]
  const segs = pathname.split("/").filter(Boolean);
  const activeLogSlug =
    segs[0] === "missions" && segs.length >= 3
      ? decodeURIComponent(segs[2])
      : null;

  const sortedByDate = useMemo(() => [...logs].sort(byDateDesc), [logs]);

  const authorGroups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; logs: MissionLogListItem[] }
    >();
    for (const log of sortedByDate) {
      const key = log.author_slug ?? log.author_name ?? "none";
      let group = map.get(key);
      if (!group) {
        group = {
          name: log.author_name ?? "Unbekannt",
          color: AUTHOR_COLORS[map.size % AUTHOR_COLORS.length],
          logs: [],
        };
        map.set(key, group);
      }
      group.logs.push(log);
    }
    return [...map.values()];
  }, [sortedByDate]);

  return (
    <div className="mission-loglist">
      <div className="mission-loglist-head">
        <Link href="/missions" className="mission-loglist-back">
          ‹ Missionen
        </Link>
      </div>

      {summary && <p className="mission-loglist-summary">{summary}</p>}

      {/* oberste Zeile: zurück zur Synopsis der Mission */}
      <Link
        href={`/missions/${missionSlug}`}
        className="mission-log-entry mission-log-synopsis"
        data-active={activeLogSlug === null ? "true" : "false"}
        aria-current={activeLogSlug === null ? "page" : undefined}
      >
        <span className="mission-log-stub">SYN</span>
        <span className="mission-log-bar">
          <span className="mission-log-name">Synopsis</span>
        </span>
      </Link>

      {logs.length === 0 ? (
        <p className="mission-log-empty">
          Keine Logs zu dieser Mission erfasst.
        </p>
      ) : (
        <>
          <p className="mission-logs-sub">Missions-Logs</p>
          <LogSortSwitch mode={sort} onChange={setSort} />

          {sort === "date" ? (
            <div className="mission-log-list">
              {sortedByDate.map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  missionSlug={missionSlug}
                  active={log.slug === activeLogSlug}
                  showAuthor
                />
              ))}
            </div>
          ) : (
            authorGroups.map((group) => (
              <section key={group.name} className="mission-log-group">
                <LcarsDataRow
                  value={group.logs.length}
                  label={group.name}
                  accentColor={group.color}
                  color={group.color}
                />
                <div className="mission-log-list mt-[8px]">
                  {group.logs.map((log) => (
                    <LogEntry
                      key={log.id}
                      log={log}
                      missionSlug={missionSlug}
                      active={log.slug === activeLogSlug}
                      showAuthor={false}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

function LogEntry({
  log,
  missionSlug,
  active,
  showAuthor,
}: {
  log: MissionLogListItem;
  missionSlug: string;
  active: boolean;
  showAuthor: boolean;
}) {
  return (
    <Link
      href={`/missions/${missionSlug}/${log.slug}`}
      className="mission-log-entry"
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
    >
      <span className="mission-log-stub">{sessionLabel(log.session_nr)}</span>
      <span className="mission-log-bar">
        <span className="mission-log-name">{log.title}</span>
        <span className="mission-log-meta">
          {showAuthor && log.author_name && (
            <span className="mission-log-author">{log.author_name}</span>
          )}
          {log.log_date && (
            <span className="mission-log-date">{fmtDate(log.log_date)}</span>
          )}
        </span>
      </span>
    </Link>
  );
}

function LogSortSwitch({
  mode,
  onChange,
}: {
  mode: LogSortMode;
  onChange: (m: LogSortMode) => void;
}) {
  const options: { key: LogSortMode; label: string }[] = [
    { key: "date", label: "Datum" },
    { key: "author", label: "Autor" },
  ];

  return (
    <div className="flex gap-[10px] w-full mb-[12px]">
      {options.map((opt) => {
        const isActive = mode === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="lcars-switch flex-1"
            style={{
              backgroundColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-surface)",
              color: isActive ? "var(--lcars-bg)" : "var(--lcars-text-data)",
              borderColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-text-data)",
            }}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}
