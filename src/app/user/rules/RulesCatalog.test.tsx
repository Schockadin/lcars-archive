import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RulesCatalog from "./RulesCatalog";

describe("RulesCatalog", () => {
  const entries = [
    { id: 1, name: "Feldmedizin", group: "Medizin", detail: "Heilkunde", html: "<p>Wunden versorgen</p>" },
    { id: 2, name: "Taktik", group: "Kommando", detail: null, html: "<p>Team koordinieren</p>" },
  ];

  it("filtert nach Freitext und Gruppe", () => {
    render(<RulesCatalog entries={entries} groupLabel="Department" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "wunden" } });
    expect(screen.getByText("Feldmedizin")).toBeInTheDocument();
    expect(screen.queryByText("Taktik")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Department filtern"), { target: { value: "Kommando" } });
    expect(screen.getByText("Taktik")).toBeInTheDocument();
    expect(screen.queryByText("Feldmedizin")).not.toBeInTheDocument();
  });

  it("sortiert alphabetisch auf- oder absteigend und kann Gruppen ausblenden", () => {
    render(<RulesCatalog entries={entries} groupLabel="Department" />);
    fireEvent.change(screen.getByLabelText("Gruppierung"), { target: { value: "none" } });
    fireEvent.change(screen.getByLabelText("Alphabetische Sortierung"), { target: { value: "desc" } });
    const titles = screen.getAllByRole("heading", { level: 3 }).map((item) => item.textContent);
    expect(titles).toEqual(["Taktik", "Feldmedizin"]);
    fireEvent.change(screen.getByLabelText("Alphabetische Sortierung"), { target: { value: "asc" } });
    expect(screen.getAllByRole("heading", { level: 3 }).map((item) => item.textContent)).toEqual(["Feldmedizin", "Taktik"]);
  });

  it("ordnet Gruppen alphabetisch passend zur gewählten Sortierung", () => {
    render(<RulesCatalog entries={entries} groupLabel="Department" />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((item) => item.textContent)).toEqual([
      "Kommando",
      "Medizin",
    ]);
    fireEvent.change(screen.getByLabelText("Alphabetische Sortierung"), { target: { value: "desc" } });
    expect(screen.getAllByRole("heading", { level: 2 }).map((item) => item.textContent)).toEqual([
      "Medizin",
      "Kommando",
    ]);
  });
});
