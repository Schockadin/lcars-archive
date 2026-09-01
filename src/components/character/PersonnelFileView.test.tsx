import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PersonnelFileView from "./PersonnelFileView";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";

const STATS: CharacterStats = {
  ...EMPTY_CHARACTER_STATS,
  pronouns: "sie/ihr",
  assignment: "Chefingenieurin",
  traits: "Ehemalige Maquis",
  attributes: { ...EMPTY_CHARACTER_STATS.attributes, fitness: 10, control: 9 },
  departments: { ...EMPTY_CHARACTER_STATS.departments, engineering: 4 },
  stressBonus: 2,
  determination: 2,
  values: ["Technik löst jedes Problem"],
  talents: ["Doppelschicht (Studious)"],
};

describe("PersonnelFileView", () => {
  it("zeigt Stammdaten und Werte als Text (kein Eingabefeld)", () => {
    render(
      <PersonnelFileView
        characterName="B'Elanna Torres"
        rank="Lieutenant"
        species="Klingone"
        portrait={null}
        stats={STATS}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveTextContent("B'Elanna Torres");
    expect(screen.getByLabelText("Rang")).toHaveTextContent("Lieutenant");
    // Spezies (Akte) und Merkmale (Bogen) teilen sich einen Kasten.
    expect(screen.getByLabelText("Spezies und Merkmale")).toHaveTextContent(
      "Klingone · Ehemalige Maquis",
    );
    expect(screen.getByLabelText("Fitness")).toHaveTextContent("10");
    expect(screen.getByLabelText("Engineering")).toHaveTextContent("4");
    // Maximaler Stress = Fitness + Bonus aus Talenten.
    expect(screen.getByLabelText("Maximaler Stress")).toHaveTextContent("12");
    expect(screen.getByText("Technik löst jedes Problem")).toBeInTheDocument();
    expect(screen.getByText("Doppelschicht (Studious)")).toBeInTheDocument();

    // Reine Ansicht: nichts ist bedienbar außer dem Vollbild-Knopf.
    expect(document.querySelectorAll("input:not([disabled])")).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Bogen im Vollbild" }),
    ).toBeInTheDocument();
  });

  it("hakt die Entschlossenheits-Kästchen bis zum gespeicherten Wert ab", () => {
    render(
      <PersonnelFileView
        characterName="Test"
        rank={null}
        species={null}
        portrait={null}
        stats={STATS}
      />,
    );

    const boxes = [1, 2, 3].map(
      (i) => screen.getByLabelText(`Entschlossenheit ${i}`) as HTMLInputElement,
    );
    expect(boxes.map((b) => b.checked)).toEqual([true, true, false]);
  });
});
