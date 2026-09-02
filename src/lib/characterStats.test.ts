import { describe, it, expect } from "vitest";
import {
  parseCharacterStats,
  isCharacterStatsEmpty,
  hasCompleteCreationValues,
  isCharacterExperience,
  validateCharacterStats,
  validateDistribution,
  computeStress,
  EMPTY_CHARACTER_STATS,
  ATTRIBUTE_RULE,
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  SCALAR_NUMBER_FIELDS,
  TEXT_FIELDS,
  LIST_FIELDS,
} from "./characterStats";
import type { CharacterStats } from "@/types/characterStats";
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
      stressBonus: 3,
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
    expect(stats.stressBonus).toBe(3);
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
      // Attribute liegen zwischen 7 und 12, Disziplinen zwischen 1 und 5.
      attributes: { control: 13, daring: 10.5, fitness: 6, insight: "10" },
      // Der Bogen hat genau drei Determinationskästchen.
      determination: 4,
      departments: { command: 3, conn: 0, security: 6 },
    });

    expect(stats.attributes.control).toBeNull();
    expect(stats.attributes.daring).toBeNull();
    expect(stats.attributes.fitness).toBeNull();
    // Zahl als String (z.B. aus einem Handimport) wird übernommen.
    expect(stats.attributes.insight).toBe(10);
    expect(stats.determination).toBeNull();
    expect(stats.departments.command).toBe(3);
    expect(stats.departments.conn).toBeNull();
    expect(stats.departments.security).toBeNull();
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

// Voraussetzung fürs Festschreiben der Ersterschaffung: danach sind beide
// Blöcke schreibgeschützt, ein leerer Wert ließe sich auch per AP nicht mehr
// füllen (siehe lockOwnCharacterCreation).
describe("hasCompleteCreationValues", () => {
  const full = parseCharacterStats({
    attributes: Object.fromEntries(ATTRIBUTE_FIELDS.map((f) => [f.key, 9])),
    departments: Object.fromEntries(DEPARTMENT_FIELDS.map((f) => [f.key, 2])),
  });

  it("erkennt einen vollständig ausgefüllten Bogen", () => {
    expect(hasCompleteCreationValues(full)).toBe(true);
  });

  it("erkennt jede einzelne Lücke", () => {
    expect(hasCompleteCreationValues(EMPTY_CHARACTER_STATS)).toBe(false);
    for (const field of ATTRIBUTE_FIELDS) {
      const stats = {
        ...full,
        attributes: { ...full.attributes, [field.key]: null },
      };
      expect(hasCompleteCreationValues(stats)).toBe(false);
    }
    for (const field of DEPARTMENT_FIELDS) {
      const stats = {
        ...full,
        departments: { ...full.departments, [field.key]: null },
      };
      expect(hasCompleteCreationValues(stats)).toBe(false);
    }
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
      { stressBonus: 0 },
      { experience: "novice" },
      { pronouns: "she/her" },
      { values: ["Ein Wert"] },
    ];
    for (const raw of cases) {
      expect(isCharacterStatsEmpty(parseCharacterStats(raw))).toBe(false);
    }
  });
});

// Verteilungsregeln der Runde: Attribute 7–12 (max. 1× 12, max. 2× 11),
// Disziplinen 1–5 (max. 1× 5, max. 2× 4).
describe("validateCharacterStats", () => {
  function withValues(
    attributes: number[],
    departments: number[] = [],
  ): CharacterStats {
    return parseCharacterStats({
      attributes: Object.fromEntries(
        ATTRIBUTE_FIELDS.map((f, i) => [f.key, attributes[i]]),
      ),
      departments: Object.fromEntries(
        DEPARTMENT_FIELDS.map((f, i) => [f.key, departments[i]]),
      ),
    });
  }

  it("akzeptiert eine regelkonforme Verteilung", () => {
    expect(
      validateCharacterStats(withValues([12, 11, 11, 10, 9, 8], [5, 4, 4, 3, 2, 1])),
    ).toEqual([]);
  });

  it("akzeptiert einen halb ausgefüllten Bogen", () => {
    // Nicht gepflegte Felder dürfen kein Regelverstoß sein.
    expect(validateCharacterStats(parseCharacterStats({}))).toEqual([]);
    expect(
      validateCharacterStats(parseCharacterStats({ attributes: { control: 12 } })),
    ).toEqual([]);
  });

  it("beanstandet zwei Attribute auf dem Maximum", () => {
    const errors = validateCharacterStats(withValues([12, 12, 10, 10, 9, 8]));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("höchstens 1 Wert auf 12");
  });

  it("beanstandet drei Attribute auf 11", () => {
    const errors = validateCharacterStats(withValues([12, 11, 11, 11, 9, 8]));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("höchstens 2 Werte auf 11");
  });

  it("beanstandet Disziplinen genauso", () => {
    const errors = validateCharacterStats(
      withValues([12, 11, 10, 10, 9, 8], [5, 5, 4, 4, 4, 1]),
    );
    expect(errors).toHaveLength(2);
    expect(errors.every((e) => e.startsWith("Disziplinen"))).toBe(true);
  });

  it("meldet Werte außerhalb des Bereichs (aus Alt-/Fremddaten)", () => {
    // parseCharacterStats verwirft solche Werte bereits; validateDistribution
    // muss sie trotzdem erkennen, wenn es direkt auf Eingaben angewandt wird
    // (Live-Prüfung im Formular).
    const errors = validateDistribution([6, 9, 13], ATTRIBUTE_RULE, "Attribute");
    expect(errors[0]).toContain("zwischen 7 und 12");
  });
});

// Stress ist kein Eingabefeld, sondern ergibt sich aus Fitness + Talent-Bonus.
describe("computeStress", () => {
  it("addiert den Talent-Bonus zur Fitness", () => {
    expect(
      computeStress(
        parseCharacterStats({ attributes: { fitness: 9 }, stressBonus: 3 }),
      ),
    ).toBe(12);
  });

  it("kommt ohne Bonus aus", () => {
    expect(
      computeStress(parseCharacterStats({ attributes: { fitness: 10 } })),
    ).toBe(10);
  });

  it("liefert ohne Fitness keinen Wert", () => {
    expect(computeStress(parseCharacterStats({ stressBonus: 3 }))).toBeNull();
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
