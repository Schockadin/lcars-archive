"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import { MissionLogPreview } from "@/types/missionLog";
import {
  AUTHOR_COLORS,
  byDateAsc,
  byDateDesc,
  fmtDate,
  sessionLabel,
} from "@/lib/missionFormat";

type LogSortMode = "date" | "mission";
type DateDir = "desc" | "asc";

// Alle Logs eines Charakters. Umschaltbar zwischen flacher Datums-Ansicht
// (auf-/absteigend) und einer Gruppierung nach Mission. Jeder Eintrag
// verlinkt auf das Log in der jeweiligen Mission.
export default function CharacterLogList({
  characterName,
  characterSlug,
  logs,
}: {
  characterName: string;
  characterSlug: string;
  logs: MissionLogPreview[];
}) {
  const [sort, setSort] = useState<LogSortMode>("mission");
  const [dateDir, setDateDir] = useState<DateDir>("desc");

  // Gruppen sortieren intern immer absteigend; die Datum-Ansicht folgt
  // der gewählten Richtung.
  const sortedByDate = useMemo(() => [...logs].sort(byDateDesc), [logs]);
  const dateView = useMemo(
    () => [...logs].sort(dateDir === "desc" ? byDateDesc : byDateAsc),
    [logs, dateDir],
  );

  const missionGroups = useMemo(() => {
    const map = new Map<
      string,
      { slug: string; title: string; color: string; logs: MissionLogPreview[] }
    >();
    for (const log of sortedByDate) {
      let group = map.get(log.mission_slug);
      if (!group) {
        group = {
          slug: log.mission_slug,
          title: log.mission_title,
          color: AUTHOR_COLORS[map.size % AUTHOR_COLORS.length],
          logs: [],
        };
        map.set(log.mission_slug, group);
      }
      group.logs.push(log);
    }
    return [...map.values()];
  }, [sortedByDate]);

  return (
    <div className="mission-loglist">
      <div className="mission-loglist-head">
        <Link
          href={`/characters/${characterSlug}`}
          className="mission-loglist-back"
        >
          ‹ {characterName}
        </Link>
      </div>

      <h1 className="lcars-data-row-heading">Logs</h1>
      <p className="lcars-eyebrow">Einsatzberichte von {characterName}</p>

      {logs.length === 0 ? (
        <p className="mission-log-empty">
          Keine Logs von diesem Charakter verfasst.
        </p>
      ) : (
        <>
          <div className="mt-[16px]">
            <SortSwitch
              options={[
                { key: "date", label: "Datum" },
                { key: "mission", label: "Mission" },
              ]}
              active={sort}
              onChange={setSort}
            />

            {sort === "date" && (
              <SortSwitch
                options={[
                  { key: "desc", label: "Neueste zuerst" },
                  { key: "asc", label: "Älteste zuerst" },
                ]}
                active={dateDir}
                onChange={setDateDir}
              />
            )}
          </div>

          {sort === "date" ? (
            <div className="mission-log-list">
              {dateView.map((log) => (
                <LogEntry key={log.id} log={log} showMission />
              ))}
            </div>
          ) : (
            missionGroups.map((group) => (
              <section key={group.slug} className="mission-log-group">
                <LcarsDataRow
                  value={group.logs.length}
                  label={group.title}
                  accentColor={group.color}
                  color={group.color}
                  href={`/missions/${group.slug}`}
                />
                <div className="mission-log-list mt-[8px]">
                  {group.logs.map((log) => (
                    <LogEntry key={log.id} log={log} showMission={false} />
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
  showMission,
}: {
  log: MissionLogPreview;
  showMission: boolean;
}) {
  return (
    <Link
      href={`/missions/${log.mission_slug}/${log.slug}`}
      className="mission-log-entry"
    >
      <span className="mission-log-stub">{sessionLabel(log.session_nr)}</span>
      <span className="mission-log-bar">
        <span className="mission-log-name">{log.title}</span>
        <span className="mission-log-meta">
          {showMission && (
            <span className="mission-log-author">{log.mission_title}</span>
          )}
          {log.log_date && (
            <span className="mission-log-date">{fmtDate(log.log_date)}</span>
          )}
        </span>
      </span>
    </Link>
  );
}

// Generischer LCARS-Pill-Umschalter (zwei oder mehr Optionen).
function SortSwitch<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { key: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-[10px] w-full mb-[12px]">
      {options.map((opt) => {
        const isActive = active === opt.key;
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
