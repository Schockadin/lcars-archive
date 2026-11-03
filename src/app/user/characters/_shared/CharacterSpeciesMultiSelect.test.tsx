import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CharacterSpeciesMultiSelect from "./CharacterSpeciesMultiSelect";

describe("CharacterSpeciesMultiSelect", () => {
  it("selects multiple species from the dropdown", () => {
    const onChange = vi.fn();
    const { container } = render(<CharacterSpeciesMultiSelect idPrefix="test" value={["Human"]} onChange={onChange} />);

    fireEvent.click(container.querySelector("summary")!);
    const andorian = screen.getByRole("checkbox", { name: "Andorianer (Andorian)" });
    fireEvent.click(andorian);

    expect(onChange).toHaveBeenCalledWith(["Human", "Andorian"]);
  });

  it("maps a stored German species name to its catalog option", () => {
    const { container } = render(<CharacterSpeciesMultiSelect idPrefix="test" value={["Vulkanierin"]} onChange={vi.fn()} />);

    fireEvent.click(container.querySelector("summary")!);
    expect(screen.getByText("Vulkanier (Vulcan)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Vulkanier (Vulcan)" })).toBeChecked();
  });
});
