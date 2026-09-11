import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ArchiveEntryList from "./ArchiveEntryList";
import type { ArchiveCategory, ArchiveEntryPreview } from "@/types/archive";

function entry(
  id: number,
  title: string,
  category: ArchiveCategory = "location",
  thumbnail: string | null = null,
): ArchiveEntryPreview {
  return {
    id,
    slug: `e-${id}`,
    title,
    category,
    tags: [],
    thumbnail,
    metadata: {
      summary: null,
      attributes: [],
      characters: [],
      missions: [],
      setting: null,
      logDate: null,
      participants: [],
      location: null,
    },
  };
}

const ENTRIES = [
  entry(1, "Erde"),
  entry(2, "Mars"),
  entry(3, "Erdorbit"),
  entry(4, "Andor", "npc"),
];

function visibleTitles() {
  return screen.getAllByRole("link").map((link) => link.textContent);
}

describe("ArchiveEntryList", () => {
  it("zeigt zunächst alle Einträge alphabetisch", () => {
    render(<ArchiveEntryList entries={ENTRIES} />);
    expect(visibleTitles()).toEqual(["Andor", "Erde", "Erdorbit", "Mars"]);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["A", "E", "M"]);
  });

  it("grenzt case-insensitiv per Titel ein", () => {
    render(<ArchiveEntryList entries={ENTRIES} />);
    fireEvent.change(screen.getByLabelText("Einträge filtern"), {
      target: { value: "erd" },
    });
    expect(screen.getByText("Erde")).toBeInTheDocument();
    expect(screen.getByText("Erdorbit")).toBeInTheDocument();
    expect(screen.queryByText("Mars")).toBeNull();
  });

  it("filtert nach vorhandener Kategorie", () => {
    render(<ArchiveEntryList entries={ENTRIES} />);
    fireEvent.change(screen.getByLabelText("Nach Kategorie filtern"), {
      target: { value: "npc" },
    });
    expect(visibleTitles()).toEqual(["Andor"]);
  });

  it("kehrt die alphabetische Reihenfolge um", () => {
    render(<ArchiveEntryList entries={ENTRIES} />);
    fireEvent.click(screen.getByText("Alphabetisch"));
    expect(visibleTitles()).toEqual(["Mars", "Erdorbit", "Erde", "Andor"]);
  });

  it("zeigt je Eintrag ein Kategorie-Etikett wie in der Chronologie", () => {
    const { container } = render(<ArchiveEntryList entries={ENTRIES} />);
    expect(
      [...container.querySelectorAll(".timeline-tag")].map((tag) => tag.textContent),
    ).toEqual(["NPC", "Ort", "Ort", "Ort"]);
  });

  it("zeigt eine Leermeldung, wenn nichts passt", () => {
    render(<ArchiveEntryList entries={ENTRIES} />);
    fireEvent.change(screen.getByLabelText("Einträge filtern"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Keine Einträge für diesen Filter."),
    ).toBeInTheDocument();
  });
});