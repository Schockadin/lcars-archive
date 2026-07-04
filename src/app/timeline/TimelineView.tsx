"use client";
import { Fragment, useMemo, useState } from "react";
import { TimelineEvent } from "@/types/timeline";
import {
  SOURCE_TYPE_LABELS,
  byEventDateAsc,
  byEventDateDesc,
  categoryVisual,
  fmtDate,
  yearOf,
} from "@/lib/timelineFormat";
import { LcarsAkteCard, LcarsSwitch } from "@/components/lcars";

type SortDir = "desc" | "asc";

// Übersicht aller Timeline-Ereignisse als LCARS-Chronik. Anders als die
// Missions-Chronik (MissionsOverview.tsx, nur Start-/End-Jahr als Kappen)
// zeigt die Jahres-Rail hier jedes Jahr, in dem mindestens ein Ereignis
// liegt, jeweils auf Höhe der ersten Karte dieses Jahres (siehe
// .timeline-chronik-Grid in lcars-components.css) — bei Ereignissen über
// große Zeitspannen hinweg (z.B. Jahrhunderte) wäre eine durchgängige
// Auflistung aller Kalenderjahre unlesbar.
export default function TimelineView({ events }: { events: TimelineEvent[] }) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [category, setCategory] = useState<string | null>(null);

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
        <p className="lcars-empty-state">
          Keine Ereignisse auf der Timeline hinterlegt.
        </p>
      ) : (
        <>
          <div className="mission-toolbar">
            <LcarsSwitch
              className="mission-sort"
              options={[
                { key: "desc", label: "Neueste zuerst" },
                { key: "asc", label: "Älteste zuerst" },
              ]}
              active={sortDir}
              onChange={setSortDir}
            />

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
            <p className="lcars-empty-state">
              Keine Ereignisse für diese Kategorie.
            </p>
          ) : (
            <div className="timeline-chronik">
              {visible.map((e, i) => {
                const year = yearOf(e.event_date);
                const showYear =
                  i === 0 || yearOf(visible[i - 1].event_date) !== year;
                const isLast = i === visible.length - 1;
                return (
                  <Fragment key={e.id}>
                    <div
                      className={
                        isLast
                          ? "timeline-rail-cell timeline-rail-cell--last"
                          : "timeline-rail-cell"
                      }
                      aria-hidden="true"
                    >
                      {showYear && (
                        <span className="timeline-rail-year">{year}</span>
                      )}
                    </div>
                    <EventCard event={e} />
                  </Fragment>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const cfg = categoryVisual(event.category);

  return (
    <LcarsAkteCard
      href={event.href}
      color={cfg.color}
      ariaLabel={`${event.title} — ${cfg.label}`}
      title={event.title}
      meta={
        <>
          <span>
            <b>Datum</b> {fmtDate(event.event_date)}
          </span>
          <span>
            <b>Kategorie</b> {cfg.label}
          </span>
          <span>
            <b>Quelle</b> {SOURCE_TYPE_LABELS[event.source_type]}
          </span>
        </>
      }
    />
  );
}
