"use client";
import { useMemo, useState } from "react";
import { MissionAuthor, MissionPreview } from "@/types/missions";
import {
  STATUS_CONFIG,
  periodLabel,
  stripHtml,
  synopsisExcerpt,
  yearOf,
} from "@/lib/missionFormat";
import {
  LcarsAkteCard,
  LcarsSortSwitch,
  LcarsListFilterInput,
  type SortDir,
} from "@/components/lcars";

// Übersicht aller Missionen als LCARS-Chronik (Zeitstrahl mit dekorativer
// Jahres-Schiene). Sortierbar nach Datum (auf-/absteigend) und filterbar
// nach Log-Autor (Missionen ohne Autor-Treffer werden ausgeblendet).
export default function MissionsOverview({
  missions,
}: {
  missions: MissionPreview[];
}) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Filter-Schlüssel = author.slug (Fallback: name), null = alle Autoren.
  const [authorKey, setAuthorKey] = useState<string | null>(null);
  // Freitext-Filter über den Missionstitel.
  const [query, setQuery] = useState("");

  const years = missions
    .map((m) => yearOf(m.started_at))
    .filter((y): y is number => y != null);
  const latestYear = years.length ? Math.max(...years) : null;
  const earliestYear = years.length ? Math.min(...years) : null;

  // Distinkte Autoren über alle Missionen für die Filter-Auswahl.
  const authors = useMemo(() => {
    const map = new Map<string, MissionAuthor>();
    for (const m of missions) {
      for (const a of m.authors) {
        const key = authorKeyOf(a);
        if (!map.has(key)) map.set(key, a);
      }
    }
    return [...map.entries()]
      .map(([key, author]) => ({ key, author }))
      .sort((a, b) => a.author.name.localeCompare(b.author.name));
  }, [missions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = missions.filter((m) => {
      if (authorKey && !m.authors.some((a) => authorKeyOf(a) === authorKey)) {
        return false;
      }
      if (q && !m.title.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => cmpStart(a, b, sortDir));
  }, [missions, authorKey, sortDir, query]);

  // Rail-Kappen folgen der Sortierrichtung (oben = erste Akte der Liste).
  const topCap = sortDir === "desc" ? latestYear : earliestYear;
  const footCap = sortDir === "desc" ? earliestYear : latestYear;

  const activeAuthor = authorKey
    ? authors.find((a) => a.key === authorKey)?.author.name
    : null;

  return (
    <div className="lcars-wide-column">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Missionen</h1>
        <p className="lcars-eyebrow">
          Zeitstrahl der Kampagne ·{" "}
          {sortDir === "desc" ? "neueste zuerst" : "älteste zuerst"}
          {activeAuthor ? ` · ${activeAuthor}` : ""}
        </p>
      </div>

      {missions.length === 0 ? (
        <p className="lcars-empty-state">
          Keine Missionen in der Datenbank hinterlegt.
        </p>
      ) : (
        <>
          <div className="mission-toolbar">
            <LcarsSortSwitch
              className="mission-sort"
              options={[{ key: "date", label: "Datum" }]}
              sortKey="date"
              sortDir={sortDir}
              onChange={(_key, dir) => setSortDir(dir)}
            />

            <LcarsListFilterInput
              value={query}
              onChange={setQuery}
              ariaLabel="Missionen filtern"
            />

            {authors.length > 0 && (
              <select
                className="mission-author-filter"
                value={authorKey ?? ""}
                onChange={(e) => setAuthorKey(e.target.value || null)}
                aria-label="Nach Autor filtern"
              >
                <option value="">Alle Autoren</option>
                {authors.map(({ key, author }) => (
                  <option key={key} value={key}>
                    {author.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Missionen für diese Filter.
            </p>
          ) : (
            <div className="mission-chronik">
              <div className="mission-rail" aria-hidden="true">
                <div className="mission-rail-cap">{topCap ?? ""}</div>
                <div className="mission-rail-fill" />
                <div className="mission-rail-foot">
                  {footCap && footCap !== topCap ? footCap : ""}
                </div>
              </div>

              <div className="mission-list">
                {visible.map((m) => (
                  <MissionCard key={m.id} mission={m} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function authorKeyOf(a: MissionAuthor): string {
  return a.slug ?? a.name;
}

// Sortierung nach started_at (ISO-String). NULL immer ans Ende.
function cmpStart(a: MissionPreview, b: MissionPreview, dir: SortDir): number {
  const da = a.started_at ?? "";
  const db = b.started_at ?? "";
  if (da === db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  if (dir === "desc") return da < db ? 1 : -1;
  return da < db ? -1 : 1;
}

function MissionCard({ mission }: { mission: MissionPreview }) {
  const cfg = STATUS_CONFIG[mission.status];
  const code = `M-${String(mission.id).padStart(2, "0")}`;

  return (
    <LcarsAkteCard
      href={`/missions/${mission.slug}`}
      color={cfg.color}
      ariaLabel={`${mission.title} — ${cfg.label}`}
      title={mission.title}
      summary={
        mission.metadata.body ? (
          synopsisExcerpt(stripHtml(mission.metadata.body))
        ) : (
          <span className="lcars-empty-state">
            Keine Zusammenfassung vorhanden
          </span>
        )
      }
      meta={
        <>
          <span>
            <b>Code</b> {code}
          </span>
          <span>
            <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
          </span>
          <span>
            <b>Logs</b> {mission.log_count}
          </span>
        </>
      }
    />
  );
}
