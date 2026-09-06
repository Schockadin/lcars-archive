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
  DEFAULT_TIMELINE_SCOPE,
  EVENT_CATEGORIES,
  ORIGIN_LABELS,
  SOURCE_TYPE_LABELS,
  TIMELINE_SCOPES,
  categoryVisual,
  filterEvents,
  fmtDate,
  peopleOf,
  periodKey,
  periodLabel,
  sortEvents,
  yearsOf,
  type TimelineEvent,
  type TimelineScope,
  type TimelineSortKey,
} from "@/lib/timelineTypes";

// Die Chronologie als Zeitstrahl: links Datum und Schiene, rechts die
// Ereigniskarte. Aufbau nach dem Entwurf (Jahresleiste, Monats-Trenner,
// Karten mit Kategorie-Etikett und Beteiligten), Optik nach dem übrigen
// Archiv — dieselbe Toolbar und dieselbe Aktenkarte wie überall.
//
// Die Chronologie ist zugleich die Missions-Übersicht: in der Vorgabe zeigt
// sie GENAU die Missionsstarts, je einer führt auf seine Missionsseite. Wer
// mehr will, schaltet den Umfang auf „Alle Ereignisse" — dann kommen
// Logbücher, Marken im Text, Gespräche, Geburtstage und das vom Modell
// Abgeleitete dazu, samt der Filter, die dafür nötig sind.
//
// Alle Filter laufen im Browser über die bereits geladene Liste: die
// Chronologie ist die Kampagne, nicht ein Suchindex — sie umfasst ein paar
// hundert Ereignisse, und ein Filter, der eine Server-Runde kostet, fühlt
// sich bei dieser Größe falsch an.
export default function TimelineView({ events }: { events: TimelineEvent[] }) {
  const [scope, setScope] = useState<TimelineScope>(DEFAULT_TIMELINE_SCOPE);
  const [sortKey, setSortKey] = useState<TimelineSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);

  // Ereignisart und Beteiligte richten sich nach dem UMFANG, nicht nach dem
  // ganzen Bestand: in der Missions-Ansicht gäbe es sonst Einträge, die
  // garantiert nichts treffen. Innerhalb des Umfangs aber ungefiltert — sonst
  // fiele die eigene Auswahl aus der Liste, sobald sie greift.
  const inScope = useMemo(
    () => filterEvents(events, { query: "", category: null, year: null, scope }),
    [events, scope],
  );

  const categories = useMemo(() => {
    const present = new Set(inScope.map((e) => e.category));
    return EVENT_CATEGORIES.filter((c) => present.has(c.key));
  }, [inScope]);

  const people = useMemo(() => peopleOf(inScope), [inScope]);

  // Die Jahresleiste zeigt nur Jahre, in denen unter den ÜBRIGEN Filtern noch
  // etwas liegt: sie wird aus den nach Suche und Ereignisart gefilterten
  // Ereignissen gebaut, aber ohne den Jahresfilter selbst — sonst bliebe nach
  // dem ersten Klick nur noch das gewählte Jahr stehen.
  const years = useMemo(() => {
    const withMatches = yearsOf(
      filterEvents(events, { query, category, person, year: null, scope }),
    );
    // Das gewählte Jahr bleibt in der Leiste, auch wenn ein anderer Filter
    // ihm alle Treffer genommen hat: sonst stünde man vor einer leeren Liste,
    // deren Ursache man nicht mehr sieht und nicht mehr anklicken kann.
    if (year && !withMatches.includes(year)) {
      return [...withMatches, year].sort().reverse();
    }
    return withMatches;
  }, [events, query, category, person, year, scope]);

  const visible = useMemo(
    () =>
      sortEvents(
        filterEvents(events, { query, category, person, year, scope }),
        sortDir,
        sortKey,
      ),
    [events, query, category, person, year, scope, sortDir, sortKey],
  );

  const activeCategory = category ? categoryVisual(category).label : null;

  // Der Umfang wechselt die Grundgesamtheit — eine Ereignisart oder eine
  // Person, die es im neuen Umfang nicht gibt, bliebe sonst als unsichtbarer
  // Filter stehen und die Liste wäre unerklärlich leer.
  function changeScope(next: TimelineScope) {
    setScope(next);
    setCategory(null);
    setPerson(null);
    setYear(null);
  }

  return (
    <div className="lcars-wide-column">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Chronologie</h1>
        <p className="lcars-eyebrow">
          {scope === "missions"
            ? "Die Einsätze der Kampagne in ihrer eigenen Zeitrechnung"
            : "Ereignisse der Kampagne in ihrer eigenen Zeitrechnung"}{" "}
          · {sortDir === "desc" ? "neueste zuerst" : "älteste zuerst"}
          {activeCategory ? ` · ${activeCategory}` : ""}
          {person ? ` · ${person}` : ""}
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
            {/* Der Umfang steht zuerst: er entscheidet, was die übrigen
                Filter überhaupt zu filtern haben. */}
            <select
              className="mission-author-filter rounded-full"
              value={scope}
              onChange={(e) => changeScope(e.target.value as TimelineScope)}
              aria-label="Umfang der Chronologie"
            >
              {TIMELINE_SCOPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>

            <LcarsSortSwitch
              className="mission-sort"
              options={[
                { key: "date", label: "Datum" },
                { key: "category", label: "Art" },
              ]}
              sortKey={sortKey}
              sortDir={sortDir}
              onChange={(key, dir) => {
                setSortKey(key as TimelineSortKey);
                setSortDir(dir);
              }}
            />

            <LcarsListFilterInput
              value={query}
              onChange={setQuery}
              ariaLabel="Ereignisse filtern"
            />

            {/* In der Missions-Ansicht ist jedes Ereignis eine Mission — eine
                Auswahl mit einem Eintrag wäre nur Beiwerk. */}
            {categories.length > 1 && (
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

            {people.length > 0 && (
              <select
                className="mission-author-filter rounded-full"
                value={person ?? ""}
                onChange={(e) => setPerson(e.target.value || null)}
                aria-label="Nach beteiligter Person filtern"
              >
                <option value="">Alle Beteiligten</option>
                {people.map((name) => (
                  <option key={name} value={name}>
                    {name}
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

          {/* Gezählt wird gegen den UMFANG, nicht gegen den ganzen Bestand:
              in der Missions-Ansicht wäre „12 von 480 Ereignissen" eine
              Auskunft über etwas, das gerade niemand sehen will. */}
          <p className="lcars-eyebrow mt-[12px]">
            {scope === "missions"
              ? visible.length === inScope.length
                ? `${inScope.length} ${inScope.length === 1 ? "Mission" : "Missionen"}`
                : `${visible.length} von ${inScope.length} Missionen`
              : visible.length === events.length
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
