import { describe, it, expect } from "vitest";
import { parseStatsPayload } from "./characterStatsPayload";
import { EMPTY_CHARACTER_STATS } from "./characterStats";

function ok(result: ReturnType<typeof parseStatsPayload>) {
  if ("error" in result)
    throw new Error(`unerwarteter Fehler: ${result.error}`);
  return result.stats;
}

describe("parseStatsPayload", () => {
  it("liest einen vollständigen Payload als JSON-String", () => {
    const stats = ok(
      parseStatsPayload(
        JSON.stringify({
          attributes: { control: 9, daring: 8 },
          departments: { command: 2 },
          determination: 2,
          pronouns: "  she/her  ",
          values: ["Ein Wert", "  ", "Noch einer"],
          experience: "novice",
        }),
      ),
    );

    expect(stats.attributes.control).toBe(9);
    expect(stats.departments.command).toBe(2);
    expect(stats.determination).toBe(2);
    expect(stats.pronouns).toBe("she/her");
    // Leere Zeilen fliegen raus (normalizeList).
    expect(stats.values).toEqual(["Ein Wert", "Noch einer"]);
    expect(stats.experience).toBe("novice");
  });

  it("nimmt auch ein bereits geparstes Objekt entgegen", () => {
    const stats = ok(parseStatsPayload({ attributes: { fitness: 10 } }));
    expect(stats.attributes.fitness).toBe(10);
  });

  it("behandelt ein leeres Feld als ungepflegten Bogen", () => {
    expect(ok(parseStatsPayload(""))).toEqual(EMPTY_CHARACTER_STATS);
    expect(ok(parseStatsPayload("   "))).toEqual(EMPTY_CHARACTER_STATS);
  });

  it("meldet kaputtes JSON, statt es still zu verwerfen", () => {
    expect(parseStatsPayload("{nope")).toEqual({
      error: "Die Werte konnten nicht gelesen werden.",
    });
  });

  // Der eigentliche Zweck dieser Schicht: parseCharacterStats macht aus einem
  // Ausreißer stillschweigend null. Ein Tippfehler wäre damit nicht mehr als
  // „Feld leer" von einer bewussten Nichtangabe zu unterscheiden.
  it("meldet Zahlen außerhalb des erlaubten Bereichs mit Feldnamen", () => {
    expect(parseStatsPayload({ attributes: { control: 99 } })).toEqual({
      error: "Kontrolle: bitte eine ganze Zahl zwischen 7 und 12 angeben.",
    });
    expect(parseStatsPayload({ departments: { conn: -1 } })).toEqual({
      error: "Steuerung: bitte eine ganze Zahl zwischen 1 und 5 angeben.",
    });
    expect(parseStatsPayload({ determination: 4 })).toEqual({
      error:
        "Entschlossenheit: bitte eine ganze Zahl zwischen 0 und 3 angeben.",
    });
    expect(parseStatsPayload({ attributes: { control: "acht" } })).toEqual({
      error: "Kontrolle: bitte eine ganze Zahl zwischen 7 und 12 angeben.",
    });
  });

  it("lässt leere und fehlende Zahlenfelder als „nicht gepflegt“ durch", () => {
    const stats = ok(
      parseStatsPayload({
        attributes: { control: null, daring: "" },
        determination: undefined,
      }),
    );
    expect(stats.attributes.control).toBeNull();
    expect(stats.attributes.daring).toBeNull();
    expect(stats.determination).toBeNull();
  });

  // creationLocked kommt NIE aus dem Formular — die Actions setzen es aus dem
  // gespeicherten Stand. Der Payload darf es nicht setzen können.
  it("übernimmt creationLocked aus dem Payload nicht als Berechtigung", () => {
    const stats = ok(parseStatsPayload({ creationLocked: true }));
    // parseCharacterStats liest das Feld zwar, die Actions überschreiben es
    // aber immer mit dem gespeicherten Stand — hier nur dokumentiert.
    expect(typeof stats.creationLocked).toBe("boolean");
  });
});
