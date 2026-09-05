import { describe, expect, it } from "vitest";
import {
  categoryVisual,
  filterEvents,
  isIsoDate,
  parseTimelineMarkers,
  periodKey,
  periodLabel,
  sortEvents,
  yearsOf,
  type TimelineEvent,
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
    href: "/missions/erste-mission",
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
