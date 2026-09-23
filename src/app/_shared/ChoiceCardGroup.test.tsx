import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChoiceCardGroup from "./ChoiceCardGroup";

const OPTIONS = [
  { id: "first", label: "Erste", description: "Erste Option" },
  { id: "second", label: "Zweite", description: "Zweite Option" },
] as const;

describe("ChoiceCardGroup", () => {
  it("zeigt und meldet die ausgewählte Option", () => {
    const onSelect = vi.fn();
    render(
      <ChoiceCardGroup
        name="choice"
        ariaLabel="Auswahl"
        options={OPTIONS}
        selected="first"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("radio", { name: /Erste/ })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: /Zweite/ }));
    expect(onSelect).toHaveBeenCalledWith("second");
  });
});
