import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataRowPill } from "./DataRowPill";

describe("DataRowPill", () => {
  it("renders the value and label text", () => {
    render(<DataRowPill value="42" label="Alter" />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Alter")).toBeInTheDocument();
  });

  it("renders no chevron when expanded is undefined", () => {
    const { container } = render(<DataRowPill value="1" label="X" />);
    expect(container.querySelector(".lcars-data-row-chevron")).toBeNull();
  });

  it("renders a closed chevron when expanded is false", () => {
    const { container } = render(
      <DataRowPill value="1" label="X" expanded={false} />,
    );
    const chevron = container.querySelector(".lcars-data-row-chevron");
    expect(chevron).not.toBeNull();
    expect(chevron?.className).not.toContain("lcars-data-row-chevron--open");
  });

  it("renders an open chevron when expanded is true", () => {
    const { container } = render(
      <DataRowPill value="1" label="X" expanded={true} />,
    );
    const chevron = container.querySelector(".lcars-data-row-chevron");
    expect(chevron?.className).toContain("lcars-data-row-chevron--open");
  });

  it("renders a link when href is set", () => {
    render(<DataRowPill value="1" label="X" href="/characters/foo" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/characters/foo");
  });

  it("renders a plain div (no link) when href is null/undefined", () => {
    render(<DataRowPill value="1" label="X" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
