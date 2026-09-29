"use client";
import { useMemo, useState } from "react";
import { STATUS_CONFIG } from "@/lib/missionFormat";
import type { GmMissionOverviewItem } from "@/lib/missions";
import { LcarsAkteCard } from "@/components/lcars";
import { missionEditHref } from "@/lib/contentRoutes";

// Durchsuchbare Übersicht. Die Karte führt direkt in die GM-Detailseite, wo
// Sessions, Summary-Blöcke und die Mission verwaltet werden.
export default function AdminMissionsBrowser({
  missions,
}: {
  missions: GmMissionOverviewItem[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return missions;
    return missions.filter((m) => m.title.toLowerCase().includes(q));
  }, [missions, search]);

  if (missions.length === 0) {
    return <p className="lcars-empty-state">Noch keine Missionen vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nach Titel filtern…"
        aria-label="Missionen filtern"
        className="lcars-input rounded-full w-full max-w-[500px] ml-auto text-[13px]"
      />

      {filtered.length === 0 ? (
        <p className="lcars-empty-state">Keine Missionen für diese Suche.</p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {filtered.map((mission) => (
            <div
              key={mission.id}
              className="flex flex-wrap items-center gap-[8px]"
            >
              <LcarsAkteCard
                href={missionEditHref(mission.slug)}
                color={STATUS_CONFIG[mission.status].color}
                className="flex-1 min-w-[240px]"
                title={
                  <>
                    {mission.title}
                    {mission.isDraft && (
                      <span className="text-lcars-primary-ink"> · Entwurf</span>
                    )}
                  </>
                }
                meta={
                  <>
                    <span>
                      <b>Status</b> {STATUS_CONFIG[mission.status].label}
                    </span>
                  </>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
