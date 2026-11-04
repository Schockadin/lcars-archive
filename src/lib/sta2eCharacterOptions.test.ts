import { describe, expect, it } from "vitest";
import {
  findRoleOption,
  getAdditionalRoleBonusNotes,
  getRoleBonusEntries,
  getSpeciesAbilityChoices,
  filterSpeciesAbilitiesForSpecies,
  normalizeSpeciesSelection,
  SPECIES_OPTIONS,
} from "./sta2eCharacterOptions";

describe("STA-2e character options", () => {
  it("offers species from the source and only abilities that are filled in there", () => {
    expect(SPECIES_OPTIONS.map((species) => species.name)).toContain("Barzan");
    expect(getSpeciesAbilityChoices(["Barzan"])).toEqual([]);
    expect(getSpeciesAbilityChoices(["Human", "Andorian"]).map((ability) => ability.name)).toEqual([
      "Faith of the Heart",
      "Intense",
    ]);
    expect(getSpeciesAbilityChoices(["Vulkanierin"])[0]?.name).toBe("Mental Discipline");
  });

  it("removes catalog abilities when their species is no longer selected", () => {
    expect(filterSpeciesAbilitiesForSpecies(
      ["Human — Faith of the Heart", "Andorian — Intense", "Custom legacy ability"],
      ["Human"],
      ["Human — Faith of the Heart", "Andorian — Intense", "Custom legacy ability"],
    )).toEqual(["Human — Faith of the Heart", "Custom legacy ability"]);
    expect(filterSpeciesAbilitiesForSpecies(
      ["Human — Faith of the Heart"],
      [],
    )).toEqual([]);
    expect(filterSpeciesAbilitiesForSpecies(["Invented ability"], ["Human"])).toEqual([]);
  });

  it("canonicalizes catalog species and only accepts existing custom species", () => {
    expect(normalizeSpeciesSelection(["Vulkanierin", "Human"])).toEqual([
      "Vulcan",
      "Human",
    ]);
    expect(normalizeSpeciesSelection(["Zyloxian"])).toBeNull();
    expect(normalizeSpeciesSelection(["Zyloxian"], ["Zyloxian"])).toEqual([
      "Zyloxian",
    ]);
  });

  it("resolves role aliases and provides the standard role bonus", () => {
    expect(findRoleOption("Comm-Officer")?.name).toBe("Communications Officer");
    expect(getRoleBonusEntries("Comm-Officer")[0]).toContain("zwei Erfolge");
    expect(getRoleBonusEntries("Technomage", ["Hausregel"])).toEqual(["Hausregel"]);
  });

  it("does not duplicate a legacy role bonus stored in Special Rules", () => {
    const oldNote = "Comm-Officer: Bei Support durch Schiffssysteme zählt der Schiffswürfel als zwei Erfolge.";
    expect(getAdditionalRoleBonusNotes("Communications Officer", [oldNote, "Eigene Notiz"])).toEqual(["Eigene Notiz"]);
    expect(getRoleBonusEntries("Communications Officer", [oldNote])).toHaveLength(1);
  });
});
