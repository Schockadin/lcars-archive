import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CharacterSheetPreview from "./CharacterSheetPreview";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";

const input = {
  characterName: "Shran",
  rank: null,
  species: null,
  portrait: null,
  stats: EMPTY_CHARACTER_STATS,
  bioHtml: null,
  talents: [],
  campaignRules: [],
};

describe("Charakterbogen — Aussehen", () => {
  it("zeigt gepflegte Angaben auch ohne Biografie", () => {
    render(
      <CharacterSheetPreview
        input={{
          ...input,
          appearance: {
            height: 182.5,
            weight: 76.25,
            hairColor: "weiß",
            eyeColor: "grün",
            skinColor: "blau",
          },
        }}
      />,
    );
    const page = within(document.querySelector(".pf-sheet")! as HTMLElement);
    for (const [label, value] of [["Größe", "182,5 cm"], ["Gewicht", "76,25 kg"], ["Haarfarbe", "weiß"], ["Augenfarbe", "grün"], ["Hautfarbe", "blau"]]) {
      expect(page.getByLabelText(label)).toHaveTextContent(value);
    }
    expect(screen.queryByRole("region", { name: "Aussehen" })).not.toBeInTheDocument();
  });

  it("zeigt bei fehlenden Angaben leere Felder auf der ersten Seite", () => {
    render(<CharacterSheetPreview input={input} />);
    for (const label of ["Größe", "Gewicht", "Haarfarbe", "Augenfarbe", "Hautfarbe"]) {
      expect(screen.getByLabelText(label)).toBeEmptyDOMElement();
    }
  });
});
