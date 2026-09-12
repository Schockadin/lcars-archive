import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SortSwitch from "./SortSwitch";

const OPTIONS = [
  { key: "title" as const, label: "Titel" },
  { key: "date" as const, label: "Datum", defaultDir: "desc" as const },
  { key: "author" as const, label: "Autor", sortable: false },
];

function renderSwitch(
  props: Partial<Parameters<typeof SortSwitch>[0]> = {},
) {
  const onChange = vi.fn();
  render(
    <SortSwitch
      options={OPTIONS}
      sortKey="title"
      sortDir="asc"
      onChange={onChange}
      {...props}
    />
  );
  return onChange;
}

describe("SortSwitch", () => {
  it("aktiviert eine neue Option aufsteigend", () => {
    const onChange = renderSwitch();

    fireEvent.click(screen.getByRole("button", { name: /Titel/ }).closest("button")!);
    // Titel ist bereits aktiv → der Klick dreht die Richtung um.
    expect(onChange).toHaveBeenCalledWith("title", "desc");
  });

  it("startet eine Option mit defaultDir in dieser Richtung", () => {
    const onChange = renderSwitch();

    fireEvent.click(screen.getByRole("button", { name: /Datum/ }));

    // Ohne defaultDir wäre es "asc" — beim Datum ist das Neueste gemeint.
    expect(onChange).toHaveBeenCalledWith("date", "desc");
  });

  it("reicht bei einer nicht sortierbaren Option die Richtung unverändert durch", () => {
    const onChange = renderSwitch({ sortDir: "desc" });

    fireEvent.click(screen.getByRole("button", { name: /Autor/ }));

    expect(onChange).toHaveBeenCalledWith("author", "desc");
  });

  it("hält den Pfeil auch an inaktiven sortierbaren Optionen im Layout", () => {
    const { container } = render(
      <SortSwitch
        options={OPTIONS}
        sortKey="title"
        sortDir="asc"
        onChange={vi.fn()}
      />
    );

    const arrows = [...container.querySelectorAll(".lcars-sort-switch-arrow")];
    // Titel und Datum sind sortierbar, Autor nicht.
    expect(arrows).toHaveLength(2);
    // Nur der aktive Pfeil ist sichtbar — der andere hält bloß den Platz,
    // damit die Beschriftung beim Umschalten nicht springt.
    const hidden = arrows.filter(
      (a) => (a as HTMLElement).style.visibility === "hidden",
    );
    expect(hidden).toHaveLength(1);
  });

  it("dreht den Pfeil der aktiven Option bei absteigender Richtung", () => {
    const { container } = render(
      <SortSwitch
        options={OPTIONS}
        sortKey="title"
        sortDir="desc"
        onChange={vi.fn()}
      />
    );

    const active = container.querySelector(
      "[aria-pressed='true'] .lcars-sort-switch-arrow",
    ) as HTMLElement;
    expect(active.style.transform).toBe("rotate(180deg)");
  });
});
