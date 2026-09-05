"use client";
import { Fragment, useMemo, useState } from "react";
import {
  LcarsAkteCard,
  LcarsSortSwitch,
  LcarsListFilterInput,
  type SortDir,
} from "@/components/lcars";
import ChronoRow from "@/components/timeline/ChronoRow";
import {
  EVENT_CATEGORIES,
  ORIGIN_LABELS,
  SOURCE_TYPE_LABELS,
  categoryVisual,
  filterEvents,
  fmtDate,
  periodKey,
  periodLabel,
  sortEvents,
  yearsOf,
  type TimelineEvent,
} from "@/lib/timelineTypes";

// Die Chronologie als Zeitstrahl: links Datum und Schiene, rechts die
// Ereigniskarte. Aufbau nach dem Entwurf (Jahresleiste, Monats-Trenner,
// Karten mit Kategorie-Etikett und Beteiligten), Optik nach dem übrigen
// Archiv — dieselbe Toolbar wie die Missions-Übersicht und dieselbe
// Aktenkarte.
//
// Alle Filter laufen im Browser über die bereits geladene Liste: die
// Chronologie ist die Kampagne, nicht ein Suchindex — sie umfasst ein paar
// hundert Ereignisse, und ein Filter, der eine Server-Runde kostet, fühlt
// sich bei dieser Größe falsch an.
export default function TimelineView({ events }: { events: TimelineEvent[] }) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);

  // Nur die Kategorien anbieten, die auch vorkommen — eine Auswahl, die
  // garantiert null Treffer liefert, hilft niemandem.
  const categories = useMemo(() => {
    const present = new Set(events.map((e) => e.category));
    return EVENT_CATEGORIES.filter((c) => present.has(c.key));
  }, [events]);

  // Die Jahresleiste zeigt nur Jahre, in denen unter den ÜBRIGEN Filtern noch
  // etwas liegt: sie wird aus den nach Suche und Ereignisart gefilterten
  // Ereignissen gebaut, aber ohne den Jahresfilter selbst — sonst bliebe nach
  // dem ersten Klick nur noch das gewählte Jahr stehen.
  const years = useMemo(() => {
    const withMatches = yearsOf(
      filterEvents(events, { query, category, year: null }),
    );
    // Das gewählte Jahr bleibt in der Leiste, auch wenn ein anderer Filter
    // ihm alle Treffer genommen hat: sonst stünde man vor einer leeren Liste,
    // deren Ursache man nicht mehr sieht und nicht mehr anklicken kann.
    if (year && !withMatches.includes(year)) {
      return [...withMatches, year].sort().reverse();
    }
    return withMatches;
  }, [events, query, category, year]);

  const visible = useMemo(
    () => sortEvents(filterEvents(events, { query, category, year }), sortDir),
    [events, query, category, year, sortDir],
  );

  const activeCategory = category ? categoryVisual(category).label : null;

  return (
    <div className="lcars-wide-column">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Chronologie</h1>
        <p className="lcars-eyebrow">
          Ereignisse der Kampagne in ihrer eigenen Zeitrechnung ·{" "}
          {sortDir === "desc" ? "neueste zuerst" : "älteste zuerst"}
          {activeCategory ? ` · ${activeCategory}` : ""}
          {year ? ` · ${year}` : ""}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="lcars-empty-state">
          Noch keine Ereignisse. Sie entstehen aus den Datumsangaben der
          Missionen, Logbücher, Gespräche und Personalakten — und aus den
          Marken, die ihr im Text setzt.
        </p>
      ) : (
        <>
          <div className="lcars-toolbar">
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
              ariaLabel="Ereignisse filtern"
            />

            {categories.length > 0 && (
              <select
                className="mission-author-filter rounded-full"
                value={category ?? ""}
                onChange={(e) => setCategory(e.target.value || null)}
                aria-label="Nach Ereignisart filtern"
              >
                <option value="">Alle Arten</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Bei nur einem Jahr gibt es nichts auszuwählen — außer der Filter
              läuft gerade, dann muss er sich zurücknehmen lassen. */}
          {(years.length > 1 || year !== null) && (
            <div className="timeline-yearbar" role="group" aria-label="Jahr">
              {/* „Alle" bleibt immer stehen — auch dann, wenn das gewählte
                  Jahr durch einen anderen Filter aus der Leiste gefallen ist,
                  muss sich die Auswahl zurücknehmen lassen. */}
              <button
                type="button"
                className="timeline-year"
                aria-pressed={year === null}
                onClick={() => setYear(null)}
              >
                Alle
              </button>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className="timeline-year"
                  aria-pressed={year === y}
                  // Ein zweiter Klick auf das aktive Jahr hebt den Filter
                  // wieder auf — sonst müsste man dafür bis nach „Alle"
                  // zurückscrollen.
                  onClick={() => setYear((current) => (current === y ? null : y))}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Ereignisse für diese Auswahl.
            </p>
          ) : (
            <div>
              {visible.map((event, index) => {
                const previous = index > 0 ? visible[index - 1] : null;
                const showPeriod =
                  !previous || periodKey(previous.date) !== periodKey(event.date);
                return (
                  <Fragment key={event.id}>
                    {showPeriod && (
                      <h2 className="timeline-period">
                        {periodLabel(event.date)}
                      </h2>
                    )}
                    <EventRow event={event} />
                  </Fragment>
                );
              })}
            </div>
          )}

          <p className="lcars-eyebrow mt-[12px]">
            {visible.length === events.length
              ? `${events.length} Ereignisse`
              : `${visible.length} von ${events.length} Ereignissen`}
          </p>
        </>
      )}
    </div>
  );
}

function EventRow({ event }: { event: TimelineEvent }) {
  const visual = categoryVisual(event.category);

  return (
    <ChronoRow date={event.date} color={visual.color}>
      <LcarsAkteCard
        href={event.href}
        color={visual.color}
        ariaLabel={`${event.title} — ${visual.label}, ${fmtDate(event.date)}`}
        title={event.title}
        summary={event.detail ?? undefined}
        meta={
          <>
            <span>
              <b>Datum</b> {fmtDate(event.date)}
            </span>
            <span className="timeline-tag">{visual.label}</span>
            <span>
              <b>Quelle</b> {SOURCE_TYPE_LABELS[event.sourceType]} ·{" "}
              {event.sourceTitle}
            </span>
            {event.people.length > 0 && (
              <span>
                <b>Beteiligt</b> {event.people.join(" · ")}
              </span>
            )}
            {/* Die Herkunft steht nur da, wo sie etwas einschränkt: dass ein
                Ereignis aus den gepflegten Angaben stammt, ist der
                Normalfall und braucht keinen Hinweis. */}
            {event.origin !== "metadata" && (
              <span>{ORIGIN_LABELS[event.origin]}</span>
            )}
          </>
        }
      />
    </ChronoRow>
  );
}
