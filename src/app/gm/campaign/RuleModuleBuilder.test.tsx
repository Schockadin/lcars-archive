import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import RuleModuleBuilder from "./RuleModuleBuilder";

const EMPTY_MODULE: RuleModuleDefinition = {
  id: "test-modul",
  name: "Testmodul",
  summary: "Ein Modul zum Testen.",
  characterRoles: ["*"],
  rules: [],
  resources: [],
  statuses: [],
  talents: [],
  prestigeClasses: [],
  schools: [],
  spells: [],
};

function BuilderHarness() {
  const [definition, setDefinition] = useState(EMPTY_MODULE);
  return (
    <RuleModuleBuilder definition={definition} onChange={setDefinition} />
  );
}

describe("RuleModuleBuilder", () => {
  it("zeigt Modul-Stammdaten und Kategorien als Formularbausteine", () => {
    render(<BuilderHarness />);

    expect(screen.getByLabelText("Modulname")).toHaveValue("Testmodul");
    expect(screen.getByLabelText("Kurzbeschreibung")).toHaveValue(
      "Ein Modul zum Testen.",
    );
    expect(screen.getByText("Regeln (0)")).toBeInTheDocument();
    expect(screen.getByText("Ressourcen (0)")).toBeInTheDocument();
    expect(screen.getByText("Talente (0)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/JSON/i)).not.toBeInTheDocument();
  });

  it("fügt einen Regelbaustein hinzu und bearbeitet seine Felder", () => {
    render(<BuilderHarness />);

    fireEvent.click(screen.getByText("Regeln (0)"));
    fireEvent.click(screen.getByRole("button", { name: "+ Regel hinzufügen" }));
    fireEvent.click(screen.getByText("Neue Regel"));
    fireEvent.change(screen.getByLabelText("Titel"), {
      target: { value: "Schiffssysteme" },
    });

    expect(screen.getByText("Schiffssysteme")).toBeInTheDocument();
  });

  it("bietet Schulen und Spell-Felder nur im Technomage-Modul an", () => {
    render(
      <RuleModuleBuilder
        definition={{
          ...EMPTY_MODULE,
          id: "technomage",
          schools: [{ id: "defence", label: "Abwehr", original: "Defence" }],
          spells: [{
            id: "shield",
            name: "Schild",
            school: "defence",
            requirements: "Keine",
            sourceCastingTime: null,
            sourceMageryDc: null,
            sourceCastingCost: null,
            sourceMaintenanceCost: null,
            sourceRange: null,
            sourceTarget: null,
            sourceDuration: null,
            elementalCategory: null,
            sourcePage: 1,
            effect: "protection",
          }],
        }}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("Technomage-Schulen (1)")).toBeInTheDocument();
    expect(screen.getByText("Technomage-Spells (1)")).toBeInTheDocument();
    expect(screen.queryByText("Technomage-Spells (0)")).not.toBeInTheDocument();
  });
});
