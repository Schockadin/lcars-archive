import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ListFilterInput from "./ListFilterInput";

describe("ListFilterInput", () => {
  it("rendert ein Suchfeld mit aria-label und Standard-Platzhalter", () => {
    render(
      <ListFilterInput value="" onChange={() => {}} ariaLabel="Test filtern" />,
    );
    const input = screen.getByLabelText("Test filtern");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("placeholder", "Filtern…");
  });

  it("meldet Eingaben über onChange", () => {
    const onChange = vi.fn();
    render(
      <ListFilterInput value="" onChange={onChange} ariaLabel="Test filtern" />,
    );
    fireEvent.change(screen.getByLabelText("Test filtern"), {
      target: { value: "abc" },
    });
    expect(onChange).toHaveBeenCalledWith("abc");
  });
});
