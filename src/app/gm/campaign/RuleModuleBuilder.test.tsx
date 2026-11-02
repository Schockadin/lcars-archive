import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import RuleModuleBuilder from "./RuleModuleBuilder";
import TechnomageRuleModuleBuilder from "./TechnomageRuleModuleBuilder";

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
  collections: [],
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

  it("baut frei benannte Inhaltsbereiche mit eigenen Auswahlfeldern und Einträgen", () => {
    render(<BuilderHarness />);

    fireEvent.click(screen.getByText("Eigene Inhaltsbereiche (0)"));
    fireEvent.click(screen.getByRole("button", { name: "+ Inhaltsbereich hinzufügen" }));
    fireEvent.click(screen.getByText("Neuer Inhaltsbereich"));
    fireEvent.change(screen.getByLabelText("Titel"), { target: { value: "Cybernetische Upgrades" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Feld hinzufügen" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Eintrag hinzufügen" }));
    fireEvent.click(screen.getByText("Neuer Eintrag"));
    fireEvent.change(screen.getByLabelText("Eintragsname"), { target: { value: "Optischer Sensor" } });

    expect(screen.getByText("Cybernetische Upgrades")).toBeInTheDocument();
    expect(screen.getByText("Optischer Sensor")).toBeInTheDocument();
    expect(screen.getByLabelText("Feldtyp")).toHaveValue("text");
    expect(screen.queryByLabelText(/JSON/i)).not.toBeInTheDocument();
  });

  it("hält den allgemeinen Editor unabhängig von Technomage-Erweiterungen", () => {
    render(<RuleModuleBuilder definition={{ ...EMPTY_MODULE, id: "technomage" }} onChange={() => undefined} />);

    expect(screen.getByText("Eigene Inhaltsbereiche (0)")).toBeInTheDocument();
    expect(screen.queryByText(/Technomage-(Schulen|Spells)/)).not.toBeInTheDocument();
  });

  it("stellt Technomage-spezifische Daten über eine optionale Erweiterung bereit", () => {
    render(
      <TechnomageRuleModuleBuilder
        definition={{
          ...EMPTY_MODULE,
          id: "technomage",
          schools: [{ id: "defence", label: "Abwehr", original: "Defence" }],
          spells: [],
        }}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("Technomage-Schulen (1)")).toBeInTheDocument();
    expect(screen.getByText("Technomage-Spells (0)")).toBeInTheDocument();
  });
});
