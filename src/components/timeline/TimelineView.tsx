"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LcarsSortSwitch,
  LcarsListFilterInput,
  type SortDir,
} from "@/components/lcars";
import ChronoRow from "@/components/timeline/ChronoRow";
import {
  DEFAULT_TIMELINE_SCOPE,
  EVENT_CATEGORIES,
  ORIGIN_LABELS,
  TIMELINE_SCOPES,
  categoryVisual,
  normalizeCategory,
  filterEvents,
  fmtDate,
  missionEndDates,
  peopleOf,
  periodKey,
  periodLabel,
  sortEvents,
  yearsOf,
  type TimelineEvent,
  type TimelineScope,
} from "@/lib/timelineTypes";
import { chronologyCategoryHref } from "@/lib/contentRoutes";

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
// Die Ereignisart aus der aktuellen Adresse: /chronologie/<art> → <art>,
// /chronologie → null. Umfänge sind keine Arten (siehe
// RESERVED_CHRONOLOGY_SEGMENTS in contentRoutes.ts) und kommen hier nicht vor,
// weil sie nie in die Adresse geschrieben werden.
function categoryFromPath(): string | null {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments[0] !== "chronologie" || segments.length < 2) return null;
  // /chronologie/mission/<slug> ist eine Missionsseite, keine Kategorie.
  if (segments.length > 2) return null;
  return decodeURIComponent(segments[1]);
}

// initialCategory kommt aus der Route (/chronologie/[kategorie], siehe
// src/app/chronologie/[kategorie]/page.tsx). Eine vorgewählte Ereignisart
// setzt den Umfang zwingend auf „Alle Ereignisse": in der Missions-Ansicht
// gibt es nur Missionen, /chronologie/conflict wäre dort garantiert leer.
//
// syncUrl schreibt die gewählte Art in die Adresszeile zurück — per
// history.pushState statt router.push, damit der Zeitstrahl nicht neu geladen
// wird und Suche, Beteiligte und Jahr stehen bleiben. pushState legt einen
// echten Verlaufseintrag an, und ein popstate-Horcher liest die Art beim
// Zurück/Vorwärts wieder aus der Adresse: vorher (replaceState) änderte sich
// die Adresse, aber „Zurück" verließ die Chronologie, statt die vorige
// Auswahl zu zeigen. Die Attrappen-Ansicht auf /dev-gallery lässt es aus: sie
// hat keine Route, in die sie schreiben dürfte.
export default function TimelineView({
  events,
  initialCategory = null,
  syncUrl = false,
}: {
  events: TimelineEvent[];
  initialCategory?: string | null;
  syncUrl?: boolean;
}) {
  const [scope, setScope] = useState<TimelineScope>(
    initialCategory ? "all" : DEFAULT_TIMELINE_SCOPE,
  );
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(initialCategory);
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

  // Die gewählte Art bleibt in der Liste, auch wenn es im Umfang gerade kein
  // Ereignis dieser Art gibt — sonst zeigte das Feld „Alle Arten", während
  // der Filter greift, und ließe sich nicht mehr zurücknehmen (ein Klick auf
  // den ohnehin angezeigten Eintrag löst kein change aus). Dieselbe Regel wie
  // in der Jahresleiste. Der Fall ist über /chronologie/[kategorie] leicht zu
  // erreichen: die Adresse wählt eine Art vor, die es (noch) nicht gibt.
  const categories = useMemo(() => {
    // Normalisiert, damit die Alt-Art „person“ und „character“ EINE
    // Art in der Auswahl sind (siehe normalizeCategory).
    const present = new Set(inScope.map((e) => normalizeCategory(e.category)));
    if (category) present.add(category);
    return EVENT_CATEGORIES.filter((c) => present.has(c.key));
  }, [inScope, category]);

  const people = useMemo(() => peopleOf(inScope), [inScope]);

  // Im Umfang „Missionen" steht je Einsatz eine Karte, die den ganzen
  // Zeitraum trägt — das Ende kommt aus dem (dort ausgeblendeten)
  // Abschluss-Ereignis. Gebildet aus ALLEN Ereignissen, nicht nur denen im
  // Umfang: das Abschluss-Ereignis ist ja gerade herausgefiltert.
  const missionEnds = useMemo(() => missionEndDates(events), [events]);

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
      ),
    [events, query, category, person, year, scope, sortDir],
  );

  // Zurück/Vorwärts: die Art steht in der Adresse, also von dort lesen. Nur
  // der Zustand wird gesetzt — die Seite bleibt stehen, sonst ginge beim
  // Blättern durch den Verlauf jedes Mal die übrige Auswahl verloren.
  useEffect(() => {
    if (!syncUrl) return;
    function onPop() {
      setCategory(categoryFromPath());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncUrl]);

  const activeCategory = category ? categoryVisual(category).label : null;

  // Ereignisart wechseln = Adresse wechseln: /chronologie/conflict ist ein
  // teilbarer Link auf genau diese Auswahl, „Alle Arten" führt zurück auf
  // /chronologie.
  function changeCategory(next: string | null) {
    setCategory(next);
    if (syncUrl && next !== categoryFromPath()) {
      window.history.pushState(null, "", chronologyCategoryHref(next));
    }
  }

  // Der Umfang wechselt die Grundgesamtheit — eine Ereignisart oder eine
  // Person, die es im neuen Umfang nicht gibt, bliebe sonst als unsichtbarer
  // Filter stehen und die Liste wäre unerklärlich leer.
  function changeScope(next: TimelineScope) {
    setScope(next);
    changeCategory(null);
    setPerson(null);
    setYear(null);
  }

  return (
    <div className="lcars-wide-column">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Chronologie</h1>
        <p className="lcars-eyebrow">
          {scope === "missions"
            ? "Die Einsätze der Kampagne mit ihrem Zeitraum"
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

            {/* Nur die Richtung: ein Zeitstrahl wird nach dem Datum
                geordnet, sonst ist er keiner. */}
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

            {/* In der Missions-Ansicht ist jedes Ereignis eine Mission — eine
                Auswahl mit einem Eintrag wäre nur Beiwerk. Läuft aber gerade
                ein Filter, muss er sich zurücknehmen lassen, auch wenn er der
                einzige Eintrag ist (wie bei der Jahresleiste). */}
            {(categories.length > 1 || category !== null) && (
              <select
                className="mission-author-filter rounded-full"
                value={category ?? ""}
                onChange={(e) => changeCategory(e.target.value || null)}
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
                    <EventRow
                      event={event}
                      endDate={
                        scope === "missions" && event.href
                          ? missionEnds.get(event.href)
                          : undefined
                      }
                    />
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

// Eine Ereigniskarte: oben Art-Etikett und Titel, darunter das Datum, und
// was Platz braucht in aufklappbaren Feldern — die Kurzfassung offen, die
// Beteiligten zu. Vorher stand alles untereinander in der Aktenkarte des
// übrigen Archivs; bei einigen hundert Ereignissen war das eine Wand aus
// Text, durch die man das Datum suchen musste.
//
// <details> statt eigenem Zustand: der Auf-/Zu-Zustand gehört zur einzelnen
// Karte, nicht in die Liste — und beim Filtern soll er nicht mitwandern.
function EventRow({
  event,
  endDate,
}: {
  event: TimelineEvent;
  // Nur im Umfang „Missionen" gesetzt: dann trägt die Karte den Zeitraum des
  // Einsatzes statt des Datums seines Beginns.
  endDate?: string;
}) {
  const visual = categoryVisual(event.category);

  return (
    <ChronoRow date={event.date} color={visual.color}>
      <div
        className="timeline-card"
        style={{ "--timeline-color": visual.color } as React.CSSProperties}
      >
        <div className="timeline-card-body">
          <div className="timeline-card-head">
            <span className="timeline-tag">{visual.label}</span>
            {/* Ein von Hand eingetragenes Ereignis hat keinen Inhalt, auf
                den zu zeigen wäre — dann steht der Titel als reiner Text. */}
            {event.href ? (
              <Link
                href={event.href}
                className="timeline-card-title"
                aria-label={`${event.title} — ${visual.label}, ${fmtDate(event.date)}`}
              >
                {event.title}
              </Link>
            ) : (
              <span className="timeline-card-title">{event.title}</span>
            )}
            {/* Der Herkunftshinweis steht nur da, wo er etwas einschränkt:
                dass ein Ereignis aus den gepflegten Angaben stammt, ist der
                Normalfall und braucht keine Marke. */}
            {event.origin !== "metadata" && (
              <span className="timeline-origin">
                {ORIGIN_LABELS[event.origin]}
              </span>
            )}
          </div>

          {/* Nur das Datum. Die Ereignisart steht schon als Etikett darüber,
              und die Quelle wiederholte meist bloß den Titel — der Titel
              führt ohnehin dorthin. */}
          <p className="timeline-card-date">
            {endDate ? (
              <>
                <b>Zeitraum</b> {fmtDate(event.date)} – {fmtDate(endDate)}
              </>
            ) : (
              <>
                <b>Datum</b> {fmtDate(event.date)}
              </>
            )}
          </p>

          {event.detail && (
            <details className="timeline-panel" open>
              <summary className="timeline-panel-head">Teaser</summary>
              {/* Von Hand eingetragene Beschreibungen sind Markdown (siehe
                  getTimeline) — die übrigen sind schlichter Text. */}
              {event.detailHtml ? (
                <div
                  className="timeline-panel-body mission-body"
                  dangerouslySetInnerHTML={{ __html: event.detailHtml }}
                />
              ) : (
                <div className="timeline-panel-body">{event.detail}</div>
              )}
            </details>
          )}

          {event.people.length > 0 && (
            <details className="timeline-panel">
              <summary className="timeline-panel-head">
                Beteiligt ({event.people.length})
              </summary>
              <div className="timeline-panel-body">
                {event.people.join(" · ")}
              </div>
            </details>
          )}
        </div>
      </div>
    </ChronoRow>
  );
}
