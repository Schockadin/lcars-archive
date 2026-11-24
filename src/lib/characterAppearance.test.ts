import { describe, expect, it } from "vitest";
import { characterAppearanceLines } from "./characterAppearance";

describe("characterAppearanceLines", () => {
  it("formatiert Maße und freie Farben für den Charakterbogen", () => {
    expect(
      characterAppearanceLines({
        height: 182.5,
        weight: 76.25,
        hairColor: "weiß",
        eyeColor: "grün",
        skinColor: "blau",
      }),
    ).toEqual([
      { label: "Größe", value: "182,5 cm" },
      { label: "Gewicht", value: "76,25 kg" },
      { label: "Haarfarbe", value: "weiß" },
      { label: "Augenfarbe", value: "grün" },
      { label: "Hautfarbe", value: "blau" },
    ]);
  });

  it("überspringt fehlende Angaben auch bei alten Akten", () => {
    expect(characterAppearanceLines()).toEqual([]);
    expect(characterAppearanceLines({ eyeColor: "gold" })).toEqual([
      { label: "Augenfarbe", value: "gold" },
    ]);
  });
});
