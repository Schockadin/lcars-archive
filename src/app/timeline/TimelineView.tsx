"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { TimelineEvent } from "@/types/timeline";
import {
  SOURCE_TYPE_LABELS,
  byEventDateAsc,
  byEventDateDesc,
  categoryVisual,
  fmtDate,
  yearOf,
} from "@/lib/timelineFormat";

type SortDir = "desc" | "asc";

// Übersicht aller Timeline-Ereignisse als LCARS-Chronik (Zeitstrahl mit
// dekorativer Jahres-Schiene) — gleiches UI-Muster wie die Missions-Chronik
// (MissionsOverview.tsx), nur sortiert nach event_date statt started_at und
// gefiltert nach Kategorie statt Autor.
export default function TimelineView({ events }: { events: TimelineEvent[] }) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [category, setCategory] = useState<string | null>(null);

  const years = events
    .map((e) => yearOf(e.event_date))
    .filter((y): y is number => y != null);
  const latestYear = years.length ? Math.max(...years) : null;
  const earliestYear = years.length ? Math.min(...years) : null;

  // Distinkte Kategorien über alle Ereignisse für die Filter-Auswahl.
  const categories = useMemo(() => {
    const set = new Set(events.map((e) => e.category));
    return [...set].sort((a, b) =>
      categoryVisual(a).label.localeCompare(categoryVisual(b).label),
    );
  }, [events]);

  const visible = useMemo(() => {
    const filtered = category ? events.filter((e) => e.category === category) : events;
    return [...filtered].sort(sortDir === "desc" ? byEventDateDesc : byEventDateAsc);
  }, [events, category, sortDir]);

  // Rail-Kappen folgen der Sortierrichtung (oben = erstes Ereignis der Liste).
  const topCap = sortDir === "desc" ? latestYear : earliestYear;
  const footCap = sortDir === "desc" ? earliestYear : latestYear;

  const activeCategory = category ? categoryVisual(category).label : null;

  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Timeline</h1>
        <p className="lcars-eyebrow">
          Chronik wichtiger Ereignisse ·{" "}
          {sortDir === "desc" ? "neueste zuerst" : "älteste zuerst"}
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
                    {categoryVisual(c).label}
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
  const cfg = categoryVisual(event.category);

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
          <span>
            <b>Quelle</b> {SOURCE_TYPE_LABELS[event.source_type]}
          </span>
        </span>
      </span>
    </Link>
  );
}
