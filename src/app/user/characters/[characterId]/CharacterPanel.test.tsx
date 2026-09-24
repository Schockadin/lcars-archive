import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CharacterPanel from "./CharacterPanel";

describe("CharacterPanel", () => {
  it("ist ein standardmäßig geöffnetes Klapp-Panel", () => {
    const { container } = render(
      <CharacterPanel en="Biography" de="Biografie">
        <p>Inhalt</p>
      </CharacterPanel>,
    );

    const panel = container.querySelector("details");
    expect(panel).toBeInstanceOf(HTMLDetailsElement);
    expect(panel).toHaveAttribute("open");
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });

  it("schaltet mit dem Stift nur den Bearbeitungsmodus", () => {
    const onToggleEdit = vi.fn();
    const { container } = render(
      <CharacterPanel
        en="Personnel File"
        de="Personalakte"
        editing={false}
        onToggleEdit={onToggleEdit}
      >
        <p>Inhalt</p>
      </CharacterPanel>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(onToggleEdit).toHaveBeenCalledTimes(1);
    expect(container.querySelector("details")).toHaveAttribute("open");
  });
});
