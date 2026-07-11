import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Switch from "./Switch";

const options = [
  { key: "asc" as const, label: "Aufsteigend" },
  { key: "desc" as const, label: "Absteigend" },
  { key: "off" as const, label: "Aus", disabled: true },
];

describe("Switch", () => {
  it("calls onChange with the clicked option's key", () => {
    const onChange = vi.fn();
    render(<Switch options={options} active="asc" onChange={onChange} />);

    fireEvent.click(screen.getByText("Absteigend"));

    expect(onChange).toHaveBeenCalledWith("desc");
  });

  it("does not call onChange when clicking a disabled option", () => {
    const onChange = vi.fn();
    render(<Switch options={options} active="asc" onChange={onChange} />);

    fireEvent.click(screen.getByText("Aus"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks the active option with aria-pressed and the active styling classes", () => {
    render(<Switch options={options} active="desc" onChange={vi.fn()} />);

    const active = screen.getByText("Absteigend");
    const inactive = screen.getByText("Aufsteigend");

    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(active.className).toContain("bg-lcars-text-data");
    expect(active.className).toContain("text-lcars-bg");

    expect(inactive).toHaveAttribute("aria-pressed", "false");
    expect(inactive.className).not.toContain("bg-lcars-text-data");
  });

  it("marks a disabled option as disabled", () => {
    render(<Switch options={options} active="asc" onChange={vi.fn()} />);
    expect(screen.getByText("Aus")).toBeDisabled();
  });
});
