"use client";
import { useMemo, useState } from "react";
import { STATUS_CONFIG } from "@/lib/missionFormat";
import type { GmMissionOverviewItem } from "@/lib/missions";
import { LcarsAkteCard } from "@/components/lcars";
import { missionEditHref } from "@/lib/contentRoutes";
import Link from "next/link";
import { PlusIcon } from "@/lib/icons";
import { fmtDate } from "@/lib/missionFormat";

// Durchsuchbare Übersicht. Die Karte führt direkt in die GM-Detailseite, wo
// Sessions, Summary-Blöcke und die Mission verwaltet werden.
export default function AdminMissionsBrowser({
  missions,
}: {
  missions: GmMissionOverviewItem[];
}) {
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"date" | "status" | "none">("date");
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [descending, setDescending] = useState(true);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = missions.filter((m) => !q || m.title.toLowerCase().includes(q));
    const direction = descending ? -1 : 1;
    filtered.sort((a, b) => {
      if (sortBy === "status") {
        const statusOrder = ["active", "completed", "failed", "abandoned"];
        const difference = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        if (difference) return difference * direction;
      }
      const dateDifference = (a.startedAt ?? "").localeCompare(b.startedAt ?? "");
      if (dateDifference) {
        if (!a.startedAt) return 1;
        if (!b.startedAt) return -1;
        return dateDifference * direction;
      }
      return a.title.localeCompare(b.title, "de");
    });
    if (groupBy === "none") return [{ key: "all", label: "Missionen", missions: filtered }];
    const grouped = new Map<string, typeof filtered>();
    for (const mission of filtered) {
      const key = groupBy === "status" ? mission.status : mission.startedAt?.slice(0, 10) || "none";
      grouped.set(key, [...(grouped.get(key) ?? []), mission]);
    }
    const result = [...grouped.entries()].map(([key, items]) => ({
      key,
      label: groupBy === "status" ? STATUS_CONFIG[key as keyof typeof STATUS_CONFIG].label : key === "none" ? "Ohne Startdatum" : fmtDate(key),
      missions: items,
    }));
    if (groupBy === "status") {
      const statusOrder = ["active", "completed", "failed", "abandoned"];
      result.sort((a, b) => statusOrder.indexOf(a.key) - statusOrder.indexOf(b.key));
    } else {
      result.sort((a, b) => {
        if (a.key === "none") return 1;
        if (b.key === "none") return -1;
        return a.key.localeCompare(b.key) * direction;
      });
    }
    return result;
  }, [missions, search, groupBy, sortBy, descending]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <Link href="/user/missions/new" className="lcars-icon-btn" aria-label="Neue Mission" title="Neue Mission"><PlusIcon /></Link>
        <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nach Titel filtern…"
        aria-label="Missionen filtern"
        className="lcars-input rounded-full w-full max-w-[500px] ml-auto text-[13px]"
        />
      </div>
      <div className="flex flex-wrap gap-[8px]">
        <label className="flex flex-col gap-[4px]"><span className="lcars-eyebrow">Gruppieren nach</span><select className="lcars-input rounded-full" value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}><option value="date">Datum</option><option value="status">Status</option><option value="none">Keine Gruppierung</option></select></label>
        <label className="flex flex-col gap-[4px]"><span className="lcars-eyebrow">Sortieren nach</span><select className="lcars-input rounded-full" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="date">Datum</option><option value="status">Status</option></select></label>
        <label className="flex flex-col gap-[4px]"><span className="lcars-eyebrow">Reihenfolge</span><select className="lcars-input rounded-full" value={descending ? "desc" : "asc"} onChange={(event) => setDescending(event.target.value === "desc")}><option value="desc">Absteigend</option><option value="asc">Aufsteigend</option></select></label>
      </div>

      {groups.every((group) => group.missions.length === 0) ? (
        <p className="lcars-empty-state">{missions.length === 0 ? "Noch keine Missionen vorhanden." : "Keine Missionen für diese Suche."}</p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {groups.map((group) => group.missions.length > 0 && <section key={group.key} className="flex flex-col gap-[6px]"><h2 className="lcars-eyebrow mt-[8px]">{group.label}</h2>{group.missions.map((mission) => (
              <div key={mission.id} className="flex flex-wrap items-center gap-[8px]">
                <LcarsAkteCard
                  href={missionEditHref(mission.slug)}
                  color={STATUS_CONFIG[mission.status].color}
                  className="flex-1 min-w-[240px]"
                  title={<>{mission.title}{mission.isDraft && <span className="text-lcars-primary-ink"> · Entwurf</span>}</>}
                  meta={<><span><b>Status</b> {STATUS_CONFIG[mission.status].label}</span><span><b>Start</b> {fmtDate(mission.startedAt)}</span></>}
                />
              </div>
            ))}</section>)}
        </div>
      )}
    </div>
  );
}
