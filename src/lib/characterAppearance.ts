import type { CharacterAppearance } from "@/types/character";

// Eine gemeinsame Darstellung für Bildschirm und PDF. Fehlende Angaben
// erzeugen keine leeren Zeilen; ältere Akten haben diese Felder noch nicht.
export function characterAppearanceLines(
  appearance?: CharacterAppearance | null,
) {
  if (!appearance) return [];
  return [
    {
      label: "Größe",
      value:
        appearance.height == null
          ? null
          : `${appearance.height.toLocaleString("de-DE")} cm`,
    },
    {
      label: "Gewicht",
      value:
        appearance.weight == null
          ? null
          : `${appearance.weight.toLocaleString("de-DE")} kg`,
    },
    { label: "Haarfarbe", value: appearance.hairColor },
    { label: "Augenfarbe", value: appearance.eyeColor },
    { label: "Hautfarbe", value: appearance.skinColor },
  ].filter((entry): entry is { label: string; value: string } =>
    Boolean(entry.value),
  );
}
