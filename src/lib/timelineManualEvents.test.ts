import { describe, it, expect } from "vitest";
import { ManualEventError, parseManualEvent } from "./timelineManualEvents";

// Die Prüfung der Eingabe läuft ohne Datenbank — die Meldungen sind das, was
// die eintragende Person zu sehen bekommt.

function form(overrides: Partial<Record<string, string>> = {}) {
  return {
    date: "2401-03-05",
    title: "Vertrag von Algeron",
    detail: "",
    category: "political",
    ...overrides,
  };
}

describe("parseManualEvent", () => {
  it("nimmt eine vollständige Eingabe an", () => {
    expect(parseManualEvent(form({ detail: "Die Grenze steht." }))).toEqual({
      date: "2401-03-05",
      title: "Vertrag von Algeron",
      detail: "Die Grenze steht.",
      category: "political",
      // Ohne Auswahl bleibt die Besetzung leer — ein freies Ereignis
      // betrifft in der Regel niemanden aus der Runde.
      characterIds: [],
    });
  });

  it("macht aus einer leeren Beschreibung null", () => {
    // Die Karte zeigt das Teaser-Feld nur, wenn es etwas zu sagen gibt.
    expect(parseManualEvent(form()).detail).toBeNull();
  });

  it("besteht auf Titel und gültigem Datum", () => {
    expect(() => parseManualEvent(form({ title: "   " }))).toThrow(
      ManualEventError,
    );
    expect(() => parseManualEvent(form({ date: "05.03.2401" }))).toThrow(
      /JJJJ-MM-TT/,
    );
    expect(() => parseManualEvent(form({ date: "2401-13-05" }))).toThrow(
      /gibt es nicht/,
    );
  });

  it("lässt dreistellige Jahre zu und füllt sie auf", () => {
    // Rückblenden reichen weit zurück; als Text sortiert nur ein
    // vierstelliges Jahr richtig.
    expect(parseManualEvent(form({ date: "999-01-02" })).date).toBe(
      "0999-01-02",
    );
  });

  it("weist eine unbekannte Ereignisart ab", () => {
    expect(() => parseManualEvent(form({ category: "erfunden" }))).toThrow(
      /Ereignisart/,
    );
  });

  it("begrenzt die Länge von Titel und Beschreibung", () => {
    expect(() => parseManualEvent(form({ title: "x".repeat(201) }))).toThrow(
      /zu lang/,
    );
    expect(() =>
      parseManualEvent(form({ detail: "x".repeat(2001) })),
    ).toThrow(/zu lang/);
  });

  it("liest die Beteiligten als Zahlen und wirft Doppelte weg", () => {
    const input = parseManualEvent({
      ...form(),
      characterIds: ["4", "9", "4"],
    });
    expect(input.characterIds).toEqual([4, 9]);
  });

  it("weist eine unsinnige Auswahl der Beteiligten ab", () => {
    expect(() =>
      parseManualEvent({ ...form(), characterIds: ["abc"] }),
    ).toThrow(ManualEventError);
  });

  it("nimmt die Alt-Ereignisart person als character an", () => {
    // Beide Schreibweisen meinten dieselbe Art; seit v1.29.49 ist es eine.
    expect(parseManualEvent(form({ category: "person" })).category).toBe(
      "character",
    );
  });
});
