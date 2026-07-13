"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LcarsDataRow,
  LcarsLogEntry,
  LcarsSortSwitch,
  type SortDir,
} from "@/components/lcars";
import { MissionLogListItem } from "@/types/missions";
import {
  AUTHOR_COLORS,
  byDateAsc,
  byDateDesc,
  sessionLabel,
} from "@/lib/missionFormat";

type LogSortMode = "date" | "author";

// Linke, persistente Log-Liste der Mission-Detailseite. Sortierbar nach
// Datum (flach, Autor in der Zeile) oder Autor (gruppiert, je Gruppe Datum
// absteigend). Das aktive Log wird aus dem Pfad ermittelt.
export default function MissionLogList({
  missionSlug,
  logs,
  canCreateLog,
}: {
  missionSlug: string;
  logs: MissionLogListItem[];
  canCreateLog: boolean;
}) {
  const [sort, setSort] = useState<LogSortMode>("author");
  const [dateDir, setDateDir] = useState<SortDir>("desc");
  const pathname = usePathname();

  // Aktives Log = drittes Pfadsegment unter /missions/[mission]/[log]
  const segs = pathname.split("/").filter(Boolean);
  const activeLogSlug =
    segs[0] === "missions" && segs.length >= 3
      ? decodeURIComponent(segs[2])
      : null;

  // Autor-Gruppen sortieren intern immer absteigend; die Datum-Ansicht
  // folgt der gewählten Richtung.
  const sortedByDate = useMemo(() => [...logs].sort(byDateDesc), [logs]);
  const dateView = useMemo(
    () => [...logs].sort(dateDir === "desc" ? byDateDesc : byDateAsc),
    [logs, dateDir],
  );

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
        <Link href="/missions" className="lcars-back-link">
          ‹ Missionen
        </Link>
      </div>

      {canCreateLog && (
        <Link
          href={`/user/mission-logs/new?mission=${missionSlug}`}
          className="lcars-pill-btn w-full mb-[8px]"
        >
          Neues Log
        </Link>
      )}

      {/* oberste Zeile: zurück zur Synopsis der Mission */}
      <LcarsLogEntry
        href={`/missions/${missionSlug}`}
        stub="SYN"
        title="Synopsis"
        active={activeLogSlug === null}
        className="mission-log-synopsis"
      />

      {logs.length === 0 ? (
        <p className="mission-log-empty">
          Keine Logs zu dieser Mission erfasst.
        </p>
      ) : (
        <>
          <LcarsSortSwitch
            className="flex w-full mb-[12px]"
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

          {sort === "date" ? (
            <div className="mission-log-list">
              {dateView.map((log) => (
                <LcarsLogEntry
                  key={log.id}
                  href={`/missions/${missionSlug}/${log.slug}`}
                  stub={sessionLabel(log.session_nr)}
                  title={log.title}
                  secondaryLabel={log.author_name}
                  date={log.log_date}
                  active={log.slug === activeLogSlug}
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
                  className="lcars-data-row--full"
                />
                <div className="mission-log-list mt-[8px]">
                  {group.logs.map((log) => (
                    <LcarsLogEntry
                      key={log.id}
                      href={`/missions/${missionSlug}/${log.slug}`}
                      stub={sessionLabel(log.session_nr)}
                      title={log.title}
                      date={log.log_date}
                      active={log.slug === activeLogSlug}
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
