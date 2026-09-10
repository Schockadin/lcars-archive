import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterPage from "./CharacterPage";
import type { CharacterListItem } from "@/lib/characters";
import type { CharacterMetadata } from "@/types/character";

function metadata(partial: Partial<CharacterMetadata> = {}): CharacterMetadata {
  return {
    rank: null,
    species: [],
    homeworld: null,
    age: null,
    dateOfBirth: null,
    affiliation: null,
    player: null,
    tags: [],
    aliases: [],
    generation: [],
    ...partial,
  };
}

const CHARACTERS: CharacterListItem[] = [
  {
    id: 1,
    slug: "tuvok",
    name: "Tuvok",
    status: "active",
    updated_at: "2401-06-12",
    metadata: metadata({
      rank: "Lieutenant Commander",
      species: ["Vulkanier"],
      player: "Dominic",
      generation: [1],
    }),
  },
  {
    id: 2,
    slug: "kira",
    name: "Kira Nerys",
    status: "retired",
    updated_at: "2401-03-20",
    metadata: metadata({ rank: "Commander", generation: [2] }),
  },
  {
    id: 3,
    slug: "shran",
    name: "Shran",
    status: "deceased",
    updated_at: "2400-11-02",
    metadata: metadata({ generation: [2] }),
  },
];

function headings() {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);
}

describe("CharacterPage", () => {
  it("gruppiert nach Status und beschriftet die Gruppen damit", () => {
    render(<CharacterPage characters={CHARACTERS} />);
    expect(headings()).toEqual(["Aktiv", "Inaktiv", "Verstorben"]);
    expect(screen.getByText("3 Charaktere")).toBeInTheDocument();
  });

  it("trägt je Karte das Rang-Kürzel", () => {
    const { container } = render(<CharacterPage characters={CHARACTERS} />);
    expect(
      [...container.querySelectorAll(".timeline-tag")].map((tag) => tag.textContent),
    ).toEqual(["LTC", "CDR"]);
  });

  it("führt jede Karte auf ihre Personalakte", () => {
    render(<CharacterPage characters={CHARACTERS} />);
    expect(
      screen
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"))
        .filter((href) => href?.startsWith("/characters/") && href !== "/characters/beziehungen"),
    ).toEqual(["/characters/tuvok", "/characters/kira", "/characters/shran"]);
  });

  it("bietet das Anlegen eines Charakters an", () => {
    render(<CharacterPage characters={CHARACTERS} />);
    expect(
      screen.getByLabelText("Charakter anlegen").getAttribute("href"),
    ).toBe("/user/characters/new");
  });

  it("gruppiert auf Wunsch nach Generation", () => {
    render(<CharacterPage characters={CHARACTERS} />);
    fireEvent.click(screen.getByText("Generation"));
    expect(headings()).toEqual(["Erste Generation", "Zweite Generation"]);
  });

  it("grenzt über Name und Rang ein", () => {
    render(<CharacterPage characters={CHARACTERS} />);
    fireEvent.change(screen.getByLabelText("Charaktere filtern"), {
      target: { value: "commander" },
    });
    expect(headings()).toEqual(["Aktiv", "Inaktiv"]);
    expect(screen.getByText("2 von 3 Charakteren")).toBeInTheDocument();
  });

  it("zeigt eine Leermeldung, wenn nichts passt", () => {
    render(<CharacterPage characters={CHARACTERS} />);
    fireEvent.change(screen.getByLabelText("Charaktere filtern"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Keine Charaktere für diesen Filter."),
    ).toBeInTheDocument();
  });
});
