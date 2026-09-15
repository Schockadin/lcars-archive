import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChangelogItems from "./ChangelogItems";

describe("ChangelogItems", () => {
  it("zeigt je Stichpunkt eine Zeile mit Kategorie-Etikett", () => {
    render(
      <ChangelogItems
        items={[{ text: "Etwas Neues", category: "inhalte" }]}
      />,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Etwas Neues");
  });

  it("erklärt eine Version ohne neue Funktionen, statt eine leere Liste zu zeigen", () => {
    const { container } = render(<ChangelogItems items={[]} />);
    expect(container.querySelector("ul")).toBeNull();
    expect(screen.getByText(/Wartungs-Version/)).toBeInTheDocument();
  });
});
