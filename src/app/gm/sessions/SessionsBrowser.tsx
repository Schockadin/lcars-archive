"use client";
import { useMemo, useState } from "react";
import ChronoCard from "@/components/timeline/ChronoCard";
import ChronoRow from "@/components/timeline/ChronoRow";
import type { GameSession } from "@/lib/gameSessions";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { fmtDate } from "@/lib/missionFormat";

export default function SessionsBrowser({ sessions }: { sessions: GameSession[] }) {
  const [search, setSearch] = useState("");
  const [missionFilter, setMissionFilter] = useState("");
  const missions = useMemo(() => {
    const options = new Map<string, string>();
    for (const session of sessions) {
      options.set(String(session.missionId ?? "none"), session.missionTitle ?? "Ohne Mission");
    }
    return [...options].sort((a, b) => a[1].localeCompare(b[1], "de"));
  }, [sessions]);
  const groups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("de");
    const filtered = sessions.filter((session) => {
      const missionMatches = !missionFilter || String(session.missionId ?? "none") === missionFilter;
      const searchable = [session.title, session.missionTitle, session.sessionDate,
        fmtDate(session.sessionDate), ...session.synopsisBlocks.flatMap((block) => [block.body, block.ingameDate, fmtDate(block.ingameDate)])];
      return missionMatches && (!query || searchable.some((value) => value?.toLocaleLowerCase("de").includes(query)));
    }).sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.id - a.id);
    // Gruppen stehen nach ihrer jüngsten Session, darin die neueste zuerst.
    const grouped = new Map<string, { title: string; sessions: GameSession[] }>();
    for (const session of filtered) {
      const key = String(session.missionId ?? "none");
      const group = grouped.get(key) ?? { title: session.missionTitle ?? "Ohne Mission", sessions: [] };
      group.sessions.push(session);
      grouped.set(key, group);
    }
    return [...grouped];
  }, [sessions, search, missionFilter]);

  return (
    <section className="flex flex-col gap-[12px]">
      <h2 className="text-lcars-primary-ink">Bisherige Sessions</h2>
      <div className="flex flex-wrap gap-[8px]">
        <label className="flex min-w-[220px] flex-1 flex-col gap-[4px]">
          <span className="lcars-eyebrow">Session suchen</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Mission, Datum oder Zusammenfassung" className="lcars-input rounded-full" />
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-[4px]">
          <span className="lcars-eyebrow">Mission filtern</span>
          <select value={missionFilter} onChange={(event) => setMissionFilter(event.target.value)} className="lcars-input rounded-full">
            <option value="">Alle Missionen</option>
            {missions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
        </label>
      </div>
      {groups.length === 0 ? (
        <p className="lcars-empty-state">{sessions.length === 0 ? "Noch keine Session eingetragen." : "Keine Sessions für diese Suche."}</p>
      ) : groups.map(([key, group]) => (
        <section key={key} aria-labelledby={`session-mission-${key}`}>
          <h3 id={`session-mission-${key}`} className="lcars-data-row-heading">{group.title}</h3>
          {group.sessions.map((session) => (
            <ChronoRow key={session.id} date={session.sessionDate} color={CONTENT_TYPE_COLOR.mission}>
              <ChronoCard color={CONTENT_TYPE_COLOR.mission} tag="Session"
                title={session.title || "Session"} href={`/gm/sessions/${session.id}`}
                date={fmtDate(session.sessionDate)}
                meta={<>
                  <span>{session.sessionAp}{session.bonusAp > 0 && ` + ${session.bonusAp}`} AP</span>
                  <span>{session.characterCount} Charaktere</span>
                  <span>{session.synopsisBlocks.length} {session.synopsisBlocks.length === 1 ? "Summary-Block" : "Summary-Blöcke"}</span>
                </>}
              />
            </ChronoRow>
          ))}
        </section>
      ))}
    </section>
  );
}
