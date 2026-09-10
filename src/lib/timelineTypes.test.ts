import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMELINE_SCOPE,
  categoryVisual,
  filterEvents,
  isIsoDate,
  isMissionStart,
  latestEventDate,
  normalizeCategory,
  missionEndDates,
  parseTimelineMarkers,
  peopleOf,
  periodKey,
  periodLabel,
  sortEvents,
  type TimelineEvent,
  yearsOf,
} from "./timelineTypes";

function event(partial: Partial<TimelineEvent>): TimelineEvent {
  return {
    id: "mission:x:start",
    date: "2401-03-05",
    title: "Ereignis",
    detail: null,
    category: "mission",
    origin: "metadata",
    sourceType: "mission",
    sourceTitle: "Erste Mission",
    href: "/chronologie/mission/erste-mission",
    people: [],
    ...partial,
  };
}

describe("parseTimelineMarkers", () => {
  it("liest Datum, Titel und Kategorie aus einem Marker", () => {
    expect(
      parseTimelineMarkers(
        "Text\n<!-- timeline: 2401-03-14 | Erstkontakt | discovery -->\nmehr Text",
      ),
    ).toEqual([
      { date: "2401-03-14", title: "Erstkontakt", category: "discovery", anchor: 1 },
    ]);
  });

  it("nimmt „other“ an, wenn keine Kategorie dabeisteht", () => {
    expect(
      parseTimelineMarkers("<!-- timeline: 2401-03-14 | Erstkontakt -->")[0]
        .category,
    ).toBe("other");
  });

  it("verwirft Marker ohne gültiges Datum, zählt sie aber mit", () => {
    // Die Ankernummer folgt der Dokumentreihenfolge ALLER Marker — genau wie
    // remarkTimelineAnchors zählt. Sonst zeigt der Link auf die falsche Stelle.
    const markers = parseTimelineMarkers(
      "<!-- timeline: irgendwann | Kaputt -->\n" +
        "<!-- timeline: 2401-03-14 | Gültig | conflict -->",
    );
    expect(markers).toHaveLength(1);
    expect(markers[0].anchor).toBe(2);
  });

  it("verwirft einen Marker ohne Titel", () => {
    expect(parseTimelineMarkers("<!-- timeline: 2401-03-14 -->")).toEqual([]);
  });

  it("findet mehrere Marker über Zeilen hinweg", () => {
    const markers = parseTimelineMarkers(
      "<!-- timeline: 2401-01-02 | Eins -->\ndazwischen\n<!--\ntimeline: 2401-02-03 | Zwei | conflict\n-->",
    );
    expect(markers.map((m) => m.title)).toEqual(["Eins", "Zwei"]);
    expect(markers.map((m) => m.anchor)).toEqual([1, 2]);
  });

  it("kommt mit leerem Text zurecht", () => {
    expect(parseTimelineMarkers("")).toEqual([]);
  });
});

describe("isIsoDate", () => {
  it("nimmt ein echtes Datum an", () => {
    expect(isIsoDate("2401-03-14")).toBe(true);
  });

  it("weist einen Tag zurück, den es im Monat nicht gibt", () => {
    expect(isIsoDate("2401-02-31")).toBe(false);
  });

  it("weist alles zurück, was nicht die ISO-Form hat", () => {
    for (const value of ["14.03.2401", "2401-3-14", "2401", ""]) {
      expect(isIsoDate(value)).toBe(false);
    }
  });
});

describe("categoryVisual", () => {
  it("kennt die eingebauten Kategorien", () => {
    expect(categoryVisual("conflict").label).toBe("Konflikt");
  });

  it("behält einen unbekannten Wert als Beschriftung, statt ihn zu verschlucken", () => {
    expect(categoryVisual("subraumfunk").label).toBe("subraumfunk");
  });
});

describe("sortEvents", () => {
  it("sortiert aufsteigend und absteigend", () => {
    const events = [
      event({ id: "b", date: "2401-06-12" }),
      event({ id: "a", date: "2401-03-05" }),
    ];
    expect(sortEvents(events, "asc").map((e) => e.id)).toEqual(["a", "b"]);
    expect(sortEvents(events, "desc").map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("hält bei gleichem Datum eine feste Reihenfolge", () => {
    const events = [
      event({ id: "z", title: "Zulu" }),
      event({ id: "a", title: "Alpha" }),
    ];
    expect(sortEvents(events, "asc").map((e) => e.id)).toEqual(["a", "z"]);
    expect(sortEvents(events, "desc").map((e) => e.id)).toEqual(["a", "z"]);
  });

  it("lässt die Eingabe unverändert", () => {
    const events = [event({ id: "b", date: "2401-06-12" }), event({ id: "a" })];
    sortEvents(events, "asc");
    expect(events.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("stellt undatierte Ereignisse in beiden Richtungen ans Ende", () => {
    const events = [
      event({ id: "ohne", date: null, title: "Gespräch" }),
      event({ id: "b", date: "2401-06-12" }),
      event({ id: "a", date: "2401-03-05" }),
    ];
    expect(sortEvents(events, "asc").map((e) => e.id)).toEqual([
      "a",
      "b",
      "ohne",
    ]);
    expect(sortEvents(events, "desc").map((e) => e.id)).toEqual([
      "b",
      "a",
      "ohne",
    ]);
  });
});

describe("undatierte Ereignisse", () => {
  it("stehen unter einer eigenen Zwischenüberschrift", () => {
    expect(periodLabel(null)).toBe("Ohne Datum");
    expect(periodKey(null)).toBe("undated");
  });

  it("liegen in keinem Jahr und fallen dem Jahresfilter zum Opfer", () => {
    const events = [event({ date: null }), event({ date: "2401-03-05" })];
    expect(yearsOf(events)).toEqual(["2401"]);
    expect(
      filterEvents(events, { query: "", category: null, year: "2401" }),
    ).toHaveLength(1);
  });

  it("bestimmen die Vorbelegung des Datumsfeldes nicht", () => {
    expect(
      latestEventDate([event({ date: null }), event({ date: "2401-03-05" })]),
    ).toBe("2401-03-05");
    expect(latestEventDate([event({ date: null })])).toBeNull();
  });
});

describe("periodLabel", () => {
  it("nennt Jahr und Monat", () => {
    expect(periodLabel("2401-03-05")).toBe("2401 · März");
  });

  it("gruppiert nach Jahr und Monat", () => {
    expect(periodKey("2401-03-05")).toBe("2401-03");
    expect(periodKey("2401-03-28")).toBe("2401-03");
  });
});

describe("yearsOf", () => {
  it("nennt jedes Jahr genau einmal, neueste zuerst", () => {
    expect(
      yearsOf([
        event({ date: "2401-06-12" }),
        event({ date: "2402-01-01" }),
        event({ date: "2401-03-05" }),
      ]),
    ).toEqual(["2402", "2401"]);
  });

  it("nennt nur Jahre, in denen tatsächlich etwas liegt", () => {
    // Die Leiste entsteht aus den bereits gefilterten Ereignissen (siehe
    // TimelineView): ein Jahr ohne Treffer darf gar nicht erst angeboten
    // werden.
    const events = [
      event({ date: "2401-03-05", category: "mission" }),
      event({ date: "2402-01-01", category: "conflict" }),
    ];
    const nurKonflikte = filterEvents(events, {
      query: "",
      category: "conflict",
      year: null,
    });
    expect(yearsOf(nurKonflikte)).toEqual(["2402"]);
  });

  it("bleibt bei einer leeren Liste leer", () => {
    expect(yearsOf([])).toEqual([]);
  });
});

describe("filterEvents", () => {
  const events = [
    event({ id: "a", title: "Erstkontakt", category: "discovery", people: ["Tuvok"] }),
    event({ id: "b", title: "Zwischenfall", category: "conflict", date: "2402-06-12" }),
    event({ id: "c", title: "Verhandlung", detail: "Auf Vulkan.", category: "political" }),
  ];

  it("filtert nach Kategorie", () => {
    expect(
      filterEvents(events, { query: "", category: "conflict", year: null }).map(
        (e) => e.id,
      ),
    ).toEqual(["b"]);
  });

  it("filtert nach Jahr", () => {
    expect(
      filterEvents(events, { query: "", category: null, year: "2402" }).map(
        (e) => e.id,
      ),
    ).toEqual(["b"]);
  });

  it("sucht auch in Beschreibung und beteiligten Personen", () => {
    expect(
      filterEvents(events, { query: "vulkan", category: null, year: null }).map(
        (e) => e.id,
      ),
    ).toEqual(["c"]);
    expect(
      filterEvents(events, { query: "tuvok", category: null, year: null }).map(
        (e) => e.id,
      ),
    ).toEqual(["a"]);
  });

  it("kombiniert die Filter", () => {
    // „Erstkontakt" gibt es, aber nicht in der Kategorie „Konflikt".
    expect(
      filterEvents(events, {
        query: "erstkontakt",
        category: "conflict",
        year: null,
      }),
    ).toEqual([]);
    expect(
      filterEvents(events, {
        query: "erstkontakt",
        category: "discovery",
        year: null,
      }).map((e) => e.id),
    ).toEqual(["a"]);
  });

  it("gibt ohne Filter alles zurück", () => {
    expect(
      filterEvents(events, { query: "  ", category: null, year: null }),
    ).toHaveLength(3);
  });
});

// Die Chronologie ist zugleich die Missions-Übersicht: in der Vorgabe steht
// dort je Einsatz GENAU ein Eintrag — sein Beginn. Ein Missionsende oder ein
// Logbuch würde die Liste verdoppeln, ohne etwas hinzuzufügen.
describe("Umfang der Chronologie", () => {
  const events = [
    event({ id: "start", phase: "start", people: ["Tuvok", "Kira"] }),
    event({ id: "ende", phase: "end", date: "2401-03-20" }),
    event({
      id: "log",
      sourceType: "mission_log",
      category: "log",
      date: "2401-03-07",
      people: ["Tuvok"],
    }),
    event({
      id: "marke",
      origin: "marker",
      category: "discovery",
      date: "2401-03-09",
    }),
  ];

  it("zeigt in der Vorgabe nur die Missionsstarts", () => {
    expect(DEFAULT_TIMELINE_SCOPE).toBe("missions");
    const visible = filterEvents(events, {
      query: "",
      category: null,
      year: null,
      scope: "missions",
    });
    expect(visible.map((e) => e.id)).toEqual(["start"]);
  });

  it("zeigt mit „Alle Ereignisse“ wieder alles", () => {
    const visible = filterEvents(events, {
      query: "",
      category: null,
      year: null,
      scope: "all",
    });
    expect(visible).toHaveLength(4);
  });

  it("hält ein Ereignis ohne Umfang-Angabe für sichtbar", () => {
    // Ältere Aufrufer (und die Jahresleiste) geben keinen Umfang mit — dann
    // darf nichts stillschweigend verschwinden.
    expect(
      filterEvents(events, { query: "", category: null, year: null }),
    ).toHaveLength(4);
  });

  it("erkennt einen Missionsstart nur an Quelle UND Phase", () => {
    expect(isMissionStart(event({ phase: "start" }))).toBe(true);
    expect(isMissionStart(event({ phase: "end" }))).toBe(false);
    expect(isMissionStart(event({}))).toBe(false);
    expect(
      isMissionStart(event({ sourceType: "mission_log", phase: "start" })),
    ).toBe(false);
  });

  it("filtert nach beteiligter Person", () => {
    const visible = filterEvents(events, {
      query: "",
      category: null,
      year: null,
      scope: "all",
      person: "Kira",
    });
    expect(visible.map((e) => e.id)).toEqual(["start"]);
  });

  it("sammelt die Beteiligten alphabetisch und ohne Dubletten", () => {
    expect(peopleOf(events)).toEqual(["Kira", "Tuvok"]);
    expect(peopleOf([])).toEqual([]);
  });
});

describe("missionEndDates", () => {
  it("ordnet jedem Einsatz sein Ende zu", () => {
    // Beginn und Abschluss tragen dieselbe Adresse — daran hängt die
    // Zuordnung, damit der Umfang „Missionen" den Zeitraum zeigen kann.
    const events = [
      event({
        id: "start",
        sourceType: "mission",
        phase: "start",
        href: "/chronologie/mission/a",
        date: "2401-01-01",
      }),
      event({
        id: "end",
        sourceType: "mission",
        phase: "end",
        href: "/chronologie/mission/a",
        date: "2401-02-01",
      }),
      // Ein Logbuch derselben Mission ist kein Abschluss.
      event({
        id: "log",
        sourceType: "mission_log",
        href: "/chronologie/mission/a/log",
        date: "2401-01-15",
      }),
    ];
    const ends = missionEndDates(events);
    expect(ends.get("/chronologie/mission/a")).toBe("2401-02-01");
    expect(ends.size).toBe(1);
  });

  it("lässt eine laufende Mission ohne Ende", () => {
    const ends = missionEndDates([
      event({ sourceType: "mission", phase: "start", href: "/m/b" }),
    ]);
    expect(ends.get("/m/b")).toBeUndefined();
  });
});

describe("latestEventDate", () => {
  it("nennt das jüngste Datum als Vorbelegung", () => {
    const events = [
      event({ id: "a", date: "2399-11-02" }),
      event({ id: "b", date: "2401-03-05" }),
      event({ id: "c", date: "2400-01-01" }),
    ];
    expect(latestEventDate(events)).toBe("2401-03-05");
  });

  it("füllt ein dreistelliges Jahr auf vier Stellen auf", () => {
    // <input type="date"> lehnt „845-02-01" ab; die Chronologie kennt solche
    // Daten aber (drei Stellen sind erlaubt).
    expect(latestEventDate([event({ date: "845-02-01" })])).toBe("0845-02-01");
  });

  it("gibt bei leerer Chronologie nichts vor", () => {
    expect(latestEventDate([])).toBeNull();
  });
});

// „person" und „character" waren dieselbe Ereignisart mit zwei Schlüsseln —
// die eine gepflegt, die andere aus Markern und aus dem Sprachmodell. Die
// zweite fiel als unbekannter Wert auf „Sonstiges" zurück und stand als
// eigene, gleichbedeutende Art in der Auswahl.
describe("normalizeCategory", () => {
  it("führt person und character zusammen", () => {
    expect(normalizeCategory("person")).toBe("character");
    expect(normalizeCategory("Person")).toBe("character");
    expect(normalizeCategory("charakter")).toBe("character");
    expect(normalizeCategory("character")).toBe("character");
  });

  it("lässt alles andere unangetastet", () => {
    expect(normalizeCategory("conflict")).toBe("conflict");
    expect(normalizeCategory("kaputt")).toBe("kaputt");
  });

  it("zeigt die Alt-Art mit Farbe und Beschriftung der Person", () => {
    const alt = categoryVisual("person");
    expect(alt.label).toBe("Person");
    expect(alt).toEqual(categoryVisual("character"));
  });

  it("filtert die Alt-Art mit, wenn nach Person gefiltert wird", () => {
    const events = [
      event({ id: "a", category: "person" }),
      event({ id: "b", category: "character" }),
      event({ id: "c", category: "conflict" }),
    ];
    const gefiltert = filterEvents(events, {
      query: "",
      category: "character",
      year: null,
      scope: "all",
    });
    expect(gefiltert.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
