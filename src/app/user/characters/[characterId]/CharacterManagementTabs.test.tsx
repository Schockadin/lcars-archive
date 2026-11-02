import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CharacterManagementTabs from "./CharacterManagementTabs";

describe("CharacterManagementTabs", () => {
  it("zeigt Werte, Biografie und Regelmodule als umschaltbare Tabs", () => {
    render(
      <CharacterManagementTabs
        values={<div>Der Wertebogen</div>}
        biography={<div>Die Biografie</div>}
        modules={<div>Technomage-Regeln</div>}
      />,
    );

    expect(screen.getByRole("tab", { name: "Charakterwerte" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Der Wertebogen")).toBeVisible();
    expect(screen.getByText("Die Biografie")).not.toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Module" }));
    expect(screen.getByRole("tab", { name: "Module" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Technomage-Regeln")).toBeVisible();
    expect(screen.getByText("Der Wertebogen")).not.toBeVisible();
  });

  it("lässt den Modul-Tab weg, wenn für den Charakter kein Modul gilt", () => {
    render(
      <CharacterManagementTabs
        values={<div>Der Wertebogen</div>}
        biography={<div>Die Biografie</div>}
      />,
    );

    expect(screen.queryByRole("tab", { name: "Module" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });
});
