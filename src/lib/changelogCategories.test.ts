import { describe, expect, it } from "vitest";
import {
  CHANGELOG_CATEGORIES,
  changelogCategoryLabel,
  changelogCategoryRank,
  hiddenCategoriesForRoles,
  isChangelogCategory,
} from "./changelogCategories";

describe("Kategorie-Katalog", () => {
  it("hat eindeutige Schlüssel", () => {
    const ids = CHANGELOG_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("erkennt bekannte und unbekannte Schlüssel", () => {
    expect(isChangelogCategory("charaktere")).toBe(true);
    expect(isChangelogCategory("gibt-es-nicht")).toBe(false);
    expect(isChangelogCategory(42)).toBe(false);
  });

  it("fällt bei unbekannten Schlüsseln auf brauchbare Werte zurück", () => {
    expect(changelogCategoryLabel("gibt-es-nicht")).toBe("gibt-es-nicht");
    // Unbekanntes sortiert ans Ende statt an den Anfang.
    expect(changelogCategoryRank("gibt-es-nicht")).toBe(
      CHANGELOG_CATEGORIES.length,
    );
  });
});

describe("hiddenCategoriesForRoles", () => {
  const map = {
    player: ["spielleitung", "konto"],
    gm: ["konto"],
  };

  it("blendet für eine Rolle genau deren Kategorien aus", () => {
    expect(hiddenCategoriesForRoles(map, ["player"])).toEqual([
      "spielleitung",
      "konto",
    ]);
  });

  it("verbirgt bei mehreren Rollen nur, was ALLE verbergen", () => {
    // Wer auch Spielleitung ist, soll die Spielleitungs-Neuerungen sehen —
    // verborgen bleibt nur das, was beide Rollen ausblenden.
    expect(hiddenCategoriesForRoles(map, ["player", "gm"])).toEqual(["konto"]);
  });

  it("blendet nichts aus, wenn eine Rolle nichts ausblendet", () => {
    expect(hiddenCategoriesForRoles(map, ["player", "admin"])).toEqual([]);
    expect(hiddenCategoriesForRoles({}, ["player"])).toEqual([]);
    expect(hiddenCategoriesForRoles(map, [])).toEqual([]);
  });
});
