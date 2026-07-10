"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LcarsDataRow,
  LcarsLogEntry,
  LcarsSortSwitch,
  type SortDir,
} from "@/components/lcars";
import { MissionLogPreview } from "@/types/missionLog";
import {
  AUTHOR_COLORS,
  byDateAsc,
  byDateDesc,
  sessionLabel,
} from "@/lib/missionFormat";

type LogSortMode = "date" | "mission";

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
  const [dateDir, setDateDir] = useState<SortDir>("desc");

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
          className="lcars-back-link"
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
            <LcarsSortSwitch
              className="flex gap-[10px] w-full mb-[12px]"
              options={[
                { key: "date", label: "Datum" },
                { key: "mission", label: "Mission", sortable: false },
              ]}
              sortKey={sort}
              sortDir={dateDir}
              onChange={(key, dir) => {
                setSort(key);
                setDateDir(dir);
              }}
            />
          </div>

          {sort === "date" ? (
            <div className="mission-log-list">
              {dateView.map((log) => (
                <LcarsLogEntry
                  key={log.id}
                  href={`/missions/${log.mission_slug}/${log.slug}`}
                  stub={sessionLabel(log.session_nr)}
                  title={log.title}
                  secondaryLabel={log.mission_title}
                  date={log.log_date}
                />
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
                  className="lcars-data-row--full"
                />
                <div className="mission-log-list mt-[8px]">
                  {group.logs.map((log) => (
                    <LcarsLogEntry
                      key={log.id}
                      href={`/missions/${log.mission_slug}/${log.slug}`}
                      stub={sessionLabel(log.session_nr)}
                      title={log.title}
                      date={log.log_date}
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
