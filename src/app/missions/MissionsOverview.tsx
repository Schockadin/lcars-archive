"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { MissionAuthor, MissionPreview } from "@/types/missions";
import {
  STATUS_CONFIG,
  periodLabel,
  stripHtml,
  synopsisExcerpt,
  yearOf,
} from "@/lib/missionFormat";

type SortDir = "desc" | "asc";

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
    const filtered = authorKey
      ? missions.filter((m) =>
          m.authors.some((a) => authorKeyOf(a) === authorKey),
        )
      : missions;
    return [...filtered].sort((a, b) => cmpStart(a, b, sortDir));
  }, [missions, authorKey, sortDir]);

  // Rail-Kappen folgen der Sortierrichtung (oben = erste Akte der Liste).
  const topCap = sortDir === "desc" ? latestYear : earliestYear;
  const footCap = sortDir === "desc" ? earliestYear : latestYear;

  const activeAuthor = authorKey
    ? authors.find((a) => a.key === authorKey)?.author.name
    : null;

  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Missionen</h1>
        <p className="lcars-eyebrow">
          Zeitstrahl der Kampagne ·{" "}
          {sortDir === "desc" ? "neueste zuerst" : "älteste zuerst"}
          {activeAuthor ? ` · ${activeAuthor}` : ""}
        </p>
      </div>

      {missions.length === 0 ? (
        <p className="char-file-bio-empty">
          Keine Missionen im Archiv hinterlegt.
        </p>
      ) : (
        <>
          <div className="mission-toolbar">
            <div className="mission-sort">
              <SortButton
                active={sortDir === "desc"}
                onClick={() => setSortDir("desc")}
              >
                Neueste zuerst
              </SortButton>
              <SortButton
                active={sortDir === "asc"}
                onClick={() => setSortDir("asc")}
              >
                Älteste zuerst
              </SortButton>
            </div>

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
            <p className="char-file-bio-empty">
              Keine Missionen für diesen Autor.
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

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="lcars-switch flex-1"
      style={{
        backgroundColor: active ? "var(--lcars-amber)" : "var(--lcars-surface)",
        color: active ? "var(--lcars-bg)" : "var(--lcars-text-data)",
        borderColor: active ? "var(--lcars-amber)" : "var(--lcars-text-data)",
      }}
    >
      {children}
    </div>
  );
}

function MissionCard({ mission }: { mission: MissionPreview }) {
  const cfg = STATUS_CONFIG[mission.status];
  const code = `M-${String(mission.id).padStart(2, "0")}`;

  return (
    <Link
      href={`/missions/${mission.slug}`}
      className="mission-akte"
      aria-label={`${mission.title} — ${cfg.label}`}
      style={{ "--mission-color": cfg.color } as React.CSSProperties}
    >
      <span className="mission-akte-rail" />
      <span className="mission-akte-body text-left">
        <span className="mission-akte-title block">{mission.title}</span>
        <span className="mission-akte-summary block">
          {mission.metadata.body ? (
            synopsisExcerpt(stripHtml(mission.metadata.body))
          ) : (
            <span className="char-file-bio-empty">
              Keine Zusammenfassung vorhanden
            </span>
          )}
        </span>
        <span className="mission-akte-meta">
          <span>
            <b>Code</b> {code}
          </span>
          <span>
            <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
          </span>
          <span>
            <b>Logs</b> {mission.log_count}
          </span>
        </span>
      </span>
    </Link>
  );
}
