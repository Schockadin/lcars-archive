import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardCharactersSection, {
  type DashboardCharacterItem,
} from "./DashboardCharactersSection";

const TVEL: DashboardCharacterItem = {
  id: 4,
  name: "T'Vel",
  rank: "Lieutenant",
  status: "active",
  isDraft: false,
};

describe("DashboardCharactersSection", () => {
  it("führt die Charakterkarte ohne redundanten Edit-Knopf in die eigene Akte", () => {
    render(<DashboardCharactersSection characters={[TVEL]} />);

    const ziele = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(ziele).toEqual(["/user/characters/4"]);
    expect(screen.queryByLabelText("T'Vel bearbeiten")).toBeNull();
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
