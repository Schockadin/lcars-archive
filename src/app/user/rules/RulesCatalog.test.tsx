import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RulesCatalog from "./RulesCatalog";

describe("RulesCatalog", () => {
  const entries = [
    { id: 1, name: "Feldmedizin", group: "Medizin", detail: "Heilkunde", html: "<p>Wunden versorgen</p>" },
    { id: 2, name: "Taktik", group: "Kommando", detail: null, html: "<p>Team koordinieren</p>" },
  ];

  it("filtert nach Freitext und Gruppe", () => {
    render(<RulesCatalog entries={entries} groupLabel="Disziplin" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "wunden" } });
    expect(screen.getByText("Feldmedizin")).toBeInTheDocument();
    expect(screen.queryByText("Taktik")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Disziplin"), { target: { value: "Kommando" } });
    expect(screen.getByText("Taktik")).toBeInTheDocument();
    expect(screen.queryByText("Feldmedizin")).not.toBeInTheDocument();
  });
});
