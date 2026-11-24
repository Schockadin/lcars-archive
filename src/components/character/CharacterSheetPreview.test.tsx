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
    const appearance = within(screen.getByRole("region", { name: "Aussehen" }));
    for (const value of ["182,5 cm", "76,25 kg", "weiß", "grün", "blau"]) {
      expect(appearance.getByText(value, { exact: false })).toBeInTheDocument();
    }
  });

  it("zeigt bei fehlenden Angaben keinen leeren Abschnitt", () => {
    render(<CharacterSheetPreview input={input} />);
    expect(
      screen.queryByRole("region", { name: "Aussehen" }),
    ).not.toBeInTheDocument();
  });
});
