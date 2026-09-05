import { describe, expect, it } from "vitest";
import {
  MAX_INFERRED_PER_RUN,
  anchorLines,
  dropKnownDates,
  parseInferredEvents,
} from "./timelineInference";

// Die Antwort eines Sprachmodells ist Text, keine Datenstruktur: es hält sich
// nicht zuverlässig an „nur JSON", zählt gern über das Limit hinaus und
// erfindet Feldwerte. Genau das prüfen diese Tests — nicht das Modell, sondern
// unseren Umgang mit dem, was zurückkommt.

const OK = JSON.stringify([
  {
    date: "2401-03-14",
    title: "Erstkontakt",
    detail: "Die Crew trifft auf eine unbekannte Präsenz.",
    category: "discovery",
    confidence: 0.8,
  },
]);

describe("parseInferredEvents", () => {
  it("liest ein sauberes Array", () => {
    expect(parseInferredEvents(OK)).toEqual([
      {
        date: "2401-03-14",
        title: "Erstkontakt",
        detail: "Die Crew trifft auf eine unbekannte Präsenz.",
        category: "discovery",
        confidence: 0.8,
      },
    ]);
  });

  it("schneidet das Array aus einer geschwätzigen Antwort heraus", () => {
    const raw = "Gerne! Hier die Ereignisse:\n```json\n" + OK + "\n```\nViel Erfolg.";
    expect(parseInferredEvents(raw)).toHaveLength(1);
  });

  it("gibt bei kaputtem JSON eine leere Liste zurück, statt zu werfen", () => {
    expect(parseInferredEvents("[{ das ist kein JSON")).toEqual([]);
    expect(parseInferredEvents("Ich habe nichts gefunden.")).toEqual([]);
    expect(parseInferredEvents("")).toEqual([]);
  });

  it("verwirft Elemente ohne gültiges Datum oder ohne Titel", () => {
    const raw = JSON.stringify([
      { date: "irgendwann", title: "Ohne Datum" },
      { date: "2401-02-31", title: "Gibt es nicht" },
      { date: "2401-03-14", title: "   " },
      { date: "2401-03-14", title: "Behalten" },
    ]);
    expect(parseInferredEvents(raw).map((e) => e.title)).toEqual(["Behalten"]);
  });

  it("führt eine unbekannte Kategorie auf „other“ zurück", () => {
    const raw = JSON.stringify([
      { date: "2401-03-14", title: "X", category: "subraumfunk" },
    ]);
    expect(parseInferredEvents(raw)[0].category).toBe("other");
  });

  it("verwirft eine Sicherheit außerhalb von 0…1, statt sie zurechtzubiegen", () => {
    for (const value of [1.4, -0.2, "hoch", null]) {
      const raw = JSON.stringify([
        { date: "2401-03-14", title: "X", confidence: value },
      ]);
      expect(parseInferredEvents(raw)[0].confidence).toBeNull();
    }
  });

  it("nimmt dasselbe Ereignis nur einmal", () => {
    const raw = JSON.stringify([
      { date: "2401-03-14", title: "Erstkontakt" },
      { date: "2401-03-14", title: "erstkontakt" },
    ]);
    expect(parseInferredEvents(raw)).toHaveLength(1);
  });

  it("hält das Limit ein, auch wenn das Modell mehr liefert", () => {
    const raw = JSON.stringify(
      Array.from({ length: 20 }, (_, i) => ({
        date: "2401-03-14",
        title: `Ereignis ${i}`,
      })),
    );
    expect(parseInferredEvents(raw)).toHaveLength(MAX_INFERRED_PER_RUN);
  });

  it("kürzt überlange Titel und Beschreibungen", () => {
    const raw = JSON.stringify([
      { date: "2401-03-14", title: "T".repeat(200), detail: "D".repeat(900) },
    ]);
    const event = parseInferredEvents(raw)[0];
    expect(event.title).toHaveLength(80);
    expect(event.detail).toHaveLength(400);
  });

  it("überspringt Elemente, die gar keine Objekte sind", () => {
    const raw = '["Text", 42, null, {"date":"2401-03-14","title":"Gut"}]';
    expect(parseInferredEvents(raw).map((e) => e.title)).toEqual(["Gut"]);
  });

  it("weist eine Antwort zurück, die kein Array ist", () => {
    expect(parseInferredEvents('{"date":"2401-03-14","title":"X"}')).toEqual([]);
  });
});

describe("anchorLines", () => {
  it("listet nur die gepflegten Angaben", () => {
    expect(
      anchorLines({ Missionsbeginn: "2401-03-05", Missionsende: null }),
    ).toBe("- Missionsbeginn: 2401-03-05");
  });

  it("sagt es dem Modell, wenn es gar keine Anker gibt", () => {
    expect(anchorLines({ Missionsbeginn: null })).toContain("keine");
  });
});

describe("dropKnownDates", () => {
  const kandidat = (date: string, title = "X") => ({
    date,
    title,
    detail: null,
    category: "other",
    confidence: null,
  });

  it("wirft weg, was der Eintrag schon selbst beisteuert", () => {
    // Eine Mission trägt ihr Startdatum als gepflegte Angabe — das Modell
    // meldet denselben Tag gern noch einmal.
    expect(
      dropKnownDates(
        [kandidat("2401-03-05", "Beginn des Einsatzes"), kandidat("2401-03-09")],
        ["2401-03-05"],
      ).map((c) => c.date),
    ).toEqual(["2401-03-09"]);
  });

  it("vergleicht über das Datum, nicht über den Titel", () => {
    // Dass das Modell die Mission anders betitelt als die Übersicht, ist der
    // Normalfall; ein Titelvergleich ließe die Dopplung durch.
    expect(
      dropKnownDates([kandidat("2401-03-05", "Ganz anderer Titel")], [
        "2401-03-05",
      ]),
    ).toEqual([]);
  });

  it("lässt alles stehen, wenn der Eintrag kein Datum führt", () => {
    const kandidaten = [kandidat("2401-03-05"), kandidat("2401-03-09")];
    expect(dropKnownDates(kandidaten, [])).toEqual(kandidaten);
  });

  it("übergeht leere Einträge in der Liste der bekannten Daten", () => {
    const kandidaten = [kandidat("2401-03-05")];
    expect(dropKnownDates(kandidaten, ["", "2402-01-01"])).toEqual(kandidaten);
  });
});
