import { describe, it, expect } from "vitest";
import {
  checkCreationFreeCounts,
  checkOpenCreationStats,
  checkTalentsFromCatalog,
} from "./characterStatsRules";
import { EMPTY_CHARACTER_STATS } from "./characterStats";
import { DEFAULT_ADVANCEMENT_RULES } from "./advancement";
import type { CharacterStats } from "@/types/characterStats";

const RULES = DEFAULT_ADVANCEMENT_RULES;
const CATALOG = ["Bold", "Studious", "Resolute"];

function stats(overrides: Partial<CharacterStats> = {}): CharacterStats {
  return { ...EMPTY_CHARACTER_STATS, ...overrides };
}

describe("checkTalentsFromCatalog", () => {
  it("lässt Katalog-Talente durch, auch umbenannte", () => {
    expect(checkTalentsFromCatalog(["Bold"], CATALOG)).toBeNull();
    // „Neuer Name (Originalname)" — zugeordnet wird über den Originalnamen.
    expect(checkTalentsFromCatalog(["Kühn (Bold)"], CATALOG)).toBeNull();
  });

  it("meldet ein Talent, das nicht im Katalog steht", () => {
    expect(checkTalentsFromCatalog(["Erfunden"], CATALOG)).toMatch(
      /Unbekanntes Talent: Erfunden/,
    );
  });

  // Alt-Bestand aus der Freitext-Zeit muss speicherbar bleiben, sonst ließe
  // sich ein solcher Bogen überhaupt nicht mehr ändern.
  it("erlaubt bereits gespeicherte Einträge außerhalb des Katalogs", () => {
    expect(
      checkTalentsFromCatalog(["Alter Eintrag"], CATALOG, ["Alter Eintrag"]),
    ).toBeNull();
  });
});

describe("checkCreationFreeCounts", () => {
  it("lässt die Freikontingente zu", () => {
    expect(
      checkCreationFreeCounts(
        stats({
          talents: Array(RULES.creationFreeTalents).fill("Bold"),
          focuses: Array(RULES.creationFreeFocuses).fill("Warpfeldtheorie"),
        }),
        RULES,
      ),
    ).toBeNull();
  });

  it("meldet zu viele Talente und zu viele Schwerpunkte", () => {
    expect(
      checkCreationFreeCounts(
        stats({ talents: Array(RULES.creationFreeTalents + 1).fill("Bold") }),
        RULES,
      ),
    ).toMatch(/Talente/);
    expect(
      checkCreationFreeCounts(
        stats({ focuses: Array(RULES.creationFreeFocuses + 1).fill("Xeno") }),
        RULES,
      ),
    ).toMatch(/Schwerpunkte/);
  });

  // Werte lassen sich später nicht kaufen — ein hartes Limit würde eine
  // Vergabe durch die Spielleitung blockieren.
  it("deckelt die Werte-Liste bewusst nicht", () => {
    expect(
      checkCreationFreeCounts(
        stats({ values: Array(RULES.creationFreeValues + 5).fill("Ein Wert") }),
        RULES,
      ),
    ).toBeNull();
  });
});

describe("checkOpenCreationStats", () => {
  it("prüft auch die Verteilungsregeln", () => {
    const tooMany = stats({
      attributes: {
        control: 12,
        daring: 12,
        fitness: 9,
        insight: 9,
        presence: 8,
        reason: 8,
      },
    });
    expect(checkOpenCreationStats(tooMany, RULES, CATALOG)).toMatch(
      /Attribute/,
    );
  });

  it("gibt null zurück, wenn alles passt", () => {
    const fine = stats({
      attributes: {
        control: 12,
        daring: 11,
        fitness: 11,
        insight: 9,
        presence: 8,
        reason: 8,
      },
      talents: ["Bold"],
    });
    expect(checkOpenCreationStats(fine, RULES, CATALOG)).toBeNull();
  });
});
