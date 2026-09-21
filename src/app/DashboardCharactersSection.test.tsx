import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardCharactersSection, {
  type DashboardCharacterItem,
} from "./DashboardCharactersSection";

const TVEL: DashboardCharacterItem = {
  id: 4,
  slug: "t-vel",
  name: "T'Vel",
  rank: "Lieutenant",
  status: "active",
  isDraft: false,
};

describe("DashboardCharactersSection", () => {
  it("führt jeden Charakter mit einem Knopf in seine Kopfdaten", () => {
    render(<DashboardCharactersSection characters={[TVEL]} />);

    // Die Karte führt in die Akte …
    const ziele = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(ziele).toContain("/characters/t-vel");
    // … der Stift daneben direkt ins Bearbeiten. Genau dafür ist die Sektion
    // da: der kurze Weg, der vorher über zwei Seiten ging.
    expect(
      screen.getByRole("link", { name: "T'Vel bearbeiten" }),
    ).toHaveAttribute("href", "/user/characters/4");
  });

  // Das Dashboard soll keine leeren Kästen zeigen — wer alle Charaktere
  // abwählt, bekommt hier nichts, nicht eine leere Überschrift (gleiche
  // Haltung wie FollowedContentSection).
  it("verschwindet ganz, wenn nichts übrig bleibt", () => {
    const { container } = render(
      <DashboardCharactersSection characters={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("kennzeichnet einen Entwurf", () => {
    render(
      <DashboardCharactersSection
        characters={[{ ...TVEL, isDraft: true, rank: null }]}
      />,
    );
    expect(screen.getByText("Entwurf")).toBeInTheDocument();
    expect(screen.queryByText("Lieutenant")).toBeNull();
  });
});
