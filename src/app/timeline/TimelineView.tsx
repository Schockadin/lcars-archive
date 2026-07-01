"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { TimelineEvent } from "@/types/timeline";
import { fmtDate, yearOf } from "@/lib/missionFormat";
import { timelineCategoryConfig } from "@/lib/timelineFormat";

type SortDir = "asc" | "desc";

// Chronologische Übersicht wichtiger Ereignisse aus Missionen, Mission-Logs,
// Archiv-Einträgen und Biografien — rein aus <!-- timeline -->-Markierungen
// im Vault gespeist (siehe scripts/ingest/timeline.ts), kein LLM beteiligt.
// UI-Muster (Rail + Akten) von der Missions-Chronik übernommen.
export default function TimelineView({ events }: { events: TimelineEvent[] }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [category, setCategory] = useState<string | null>(null);

  const years = events
    .map((e) => yearOf(e.event_date))
    .filter((y): y is number => y != null);
  const earliestYear = years.length ? Math.min(...years) : null;
  const latestYear = years.length ? Math.max(...years) : null;

  const categories = useMemo(() => {
    const set = new Set(events.map((e) => e.category));
    return [...set].sort((a, b) =>
      timelineCategoryConfig(a).label.localeCompare(timelineCategoryConfig(b).label),
    );
  }, [events]);

  const visible = useMemo(() => {
    const filtered = category ? events.filter((e) => e.category === category) : events;
    return [...filtered].sort((a, b) => cmpDate(a, b, sortDir));
  }, [events, category, sortDir]);

  const topCap = sortDir === "asc" ? earliestYear : latestYear;
  const footCap = sortDir === "asc" ? latestYear : earliestYear;

  const activeCategory = category ? timelineCategoryConfig(category).label : null;

  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Timeline</h1>
        <p className="lcars-eyebrow">
          Chronik wichtiger Ereignisse ·{" "}
          {sortDir === "asc" ? "älteste zuerst" : "neueste zuerst"}
          {activeCategory ? ` · ${activeCategory}` : ""}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="char-file-bio-empty">
          Keine Ereignisse auf der Timeline hinterlegt.
        </p>
      ) : (
        <>
          <div className="mission-toolbar">
            <div className="mission-sort">
              <SortButton active={sortDir === "asc"} onClick={() => setSortDir("asc")}>
                Älteste zuerst
              </SortButton>
              <SortButton active={sortDir === "desc"} onClick={() => setSortDir("desc")}>
                Neueste zuerst
              </SortButton>
            </div>

            {categories.length > 0 && (
              <select
                className="mission-author-filter"
                value={category ?? ""}
                onChange={(e) => setCategory(e.target.value || null)}
                aria-label="Nach Kategorie filtern"
              >
                <option value="">Alle Kategorien</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {timelineCategoryConfig(c).label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="char-file-bio-empty">
              Keine Ereignisse für diese Kategorie.
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
                {visible.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Aufsteigende/absteigende Datums-Sortierung (ISO-Strings).
function cmpDate(a: TimelineEvent, b: TimelineEvent, dir: SortDir): number {
  if (a.event_date === b.event_date) return 0;
  if (dir === "asc") return a.event_date < b.event_date ? -1 : 1;
  return a.event_date < b.event_date ? 1 : -1;
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

function EventCard({ event }: { event: TimelineEvent }) {
  const cfg = timelineCategoryConfig(event.category);

  return (
    <Link
      href={event.href}
      className="mission-akte"
      aria-label={`${event.title} — ${cfg.label}`}
      style={{ "--mission-color": cfg.color } as React.CSSProperties}
    >
      <span className="mission-akte-rail" />
      <span className="mission-akte-body text-left">
        <span className="mission-akte-title block">{event.title}</span>
        <span className="mission-akte-meta">
          <span>
            <b>Datum</b> {fmtDate(event.event_date)}
          </span>
          <span>
            <b>Kategorie</b> {cfg.label}
          </span>
        </span>
      </span>
    </Link>
  );
}
