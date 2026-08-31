import { describe, it, expect } from "vitest";
import {
  parseCharacterStats,
  isCharacterStatsEmpty,
  isCharacterExperience,
  EMPTY_CHARACTER_STATS,
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  SCALAR_NUMBER_FIELDS,
  TEXT_FIELDS,
  LIST_FIELDS,
} from "./characterStats";
import { parseLines } from "./formParsing";

// parseCharacterStats bekommt rohes jsonb aus characters.metadata.stats — also
// auch Datensätze, die vor dem Feature angelegt wurden (kein stats-Schlüssel)
// oder von Hand/per Ingest befüllt wurden. Es muss deshalb IMMER ein
// vollständiges Objekt liefern, ohne je zu werfen.
describe("parseCharacterStats", () => {
  it("liefert für fehlende/kaputte Daten die leeren Werte", () => {
    for (const raw of [undefined, null, "kein objekt", 42, []]) {
      expect(parseCharacterStats(raw)).toEqual(EMPTY_CHARACTER_STATS);
    }
  });

  it("übernimmt gepflegte Werte unverändert", () => {
    const stats = parseCharacterStats({
      pronouns: "he/him",
      characterRole: "Technomage",
      experience: "experienced",
      attributes: { control: 12, daring: 8 },
      departments: { security: 4 },
      stress: 11,
      determination: 2,
      values: ["Technomage-Kodex", "Verantwortung bedeutet Schutz"],
      focuses: ["Cybernetics"],
    });

    expect(stats.pronouns).toBe("he/him");
    expect(stats.characterRole).toBe("Technomage");
    expect(stats.experience).toBe("experienced");
    expect(stats.attributes.control).toBe(12);
    expect(stats.attributes.daring).toBe(8);
    expect(stats.departments.security).toBe(4);
    expect(stats.stress).toBe(11);
    expect(stats.determination).toBe(2);
    expect(stats.values).toEqual([
      "Technomage-Kodex",
      "Verantwortung bedeutet Schutz",
    ]);
    expect(stats.focuses).toEqual(["Cybernetics"]);
    // Nicht gepflegte Felder bleiben leer statt undefined zu werden.
    expect(stats.attributes.reason).toBeNull();
    expect(stats.talents).toEqual([]);
  });

  it("verwirft Zahlen außerhalb des erlaubten Bereichs und Nicht-Ganzzahlen", () => {
    const stats = parseCharacterStats({
      attributes: { control: 99, daring: 2.5, fitness: -1, insight: "10" },
      // Der Bogen hat genau drei Determinationskästchen.
      determination: 4,
      departments: { command: 3 },
    });

    expect(stats.attributes.control).toBeNull();
    expect(stats.attributes.daring).toBeNull();
    expect(stats.attributes.fitness).toBeNull();
    // Zahl als String (z.B. aus einem Handimport) wird übernommen.
    expect(stats.attributes.insight).toBe(10);
    expect(stats.determination).toBeNull();
    expect(stats.departments.command).toBe(3);
  });

  it("säubert Listen und Freitexte", () => {
    const stats = parseCharacterStats({
      pronouns: "   ",
      traits: "  Human/Centauri  ",
      values: ["  Wert  ", "", 42, null, "Zweiter"],
      talents: "keine liste",
    });

    expect(stats.pronouns).toBeNull();
    expect(stats.traits).toBe("Human/Centauri");
    expect(stats.values).toEqual(["Wert", "Zweiter"]);
    expect(stats.talents).toEqual([]);
  });

  it("akzeptiert nur die drei bekannten Erfahrungsstufen", () => {
    expect(parseCharacterStats({ experience: "veteran" }).experience).toBe(
      "veteran",
    );
    expect(parseCharacterStats({ experience: "Held" }).experience).toBeNull();
    expect(isCharacterExperience("novice")).toBe(true);
    expect(isCharacterExperience("erfahren")).toBe(false);
  });
});

describe("isCharacterStatsEmpty", () => {
  it("erkennt einen komplett ungepflegten Bogen", () => {
    expect(isCharacterStatsEmpty(EMPTY_CHARACTER_STATS)).toBe(true);
    expect(isCharacterStatsEmpty(parseCharacterStats({}))).toBe(true);
  });

  it("erkennt jedes einzelne gepflegte Feld", () => {
    const cases: unknown[] = [
      { attributes: { control: 10 } },
      { departments: { conn: 1 } },
      { stress: 0 },
      { experience: "novice" },
      { pronouns: "she/her" },
      { values: ["Ein Wert"] },
    ];
    for (const raw of cases) {
      expect(isCharacterStatsEmpty(parseCharacterStats(raw))).toBe(false);
    }
  });
});

// Die Feldlisten steuern Formular, Einlesen in der Server-Action UND Anzeige —
// Tippfehler in einem Schlüssel würden dort still ein Feld verschlucken.
describe("Feldkatalog", () => {
  it("deckt sich mit den Schlüsseln von CharacterStats", () => {
    for (const field of ATTRIBUTE_FIELDS) {
      expect(EMPTY_CHARACTER_STATS.attributes).toHaveProperty(field.key);
    }
    for (const field of DEPARTMENT_FIELDS) {
      expect(EMPTY_CHARACTER_STATS.departments).toHaveProperty(field.key);
    }
    for (const field of [
      ...SCALAR_NUMBER_FIELDS,
      ...TEXT_FIELDS,
      ...LIST_FIELDS,
    ]) {
      expect(EMPTY_CHARACTER_STATS).toHaveProperty(field.key);
    }
  });

  it("hat je Gruppe eindeutige Schlüssel", () => {
    const keys = [
      ...SCALAR_NUMBER_FIELDS.map((f) => f.key),
      ...TEXT_FIELDS.map((f) => f.key),
      ...LIST_FIELDS.map((f) => f.key),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// Die Listenfelder des Bogens werden zeilenweise erfasst — Einträge dürfen
// selbst Kommata enthalten ("RayGun: Deadly/Stun 4, 1H, Charge").
describe("parseLines", () => {
  it("trennt je Zeile, trimmt und wirft Leerzeilen weg", () => {
    expect(parseLines("Unarmed: Stun 3, 1H\n\n  RayGun: Deadly/Stun 4, 1H  \n")).toEqual([
      "Unarmed: Stun 3, 1H",
      "RayGun: Deadly/Stun 4, 1H",
    ]);
  });

  it("kommt mit Windows-Zeilenenden und leerem Feld klar", () => {
    expect(parseLines("Erste\r\nZweite")).toEqual(["Erste", "Zweite"]);
    expect(parseLines(null)).toEqual([]);
    expect(parseLines("   ")).toEqual([]);
  });

  it("behält Doppelungen (dieselbe Waffe darf zweimal auf dem Bogen stehen)", () => {
    expect(parseLines("Phaser\nPhaser")).toEqual(["Phaser", "Phaser"]);
  });
});
