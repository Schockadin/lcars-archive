import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ArchiveEntryList from "./ArchiveEntryList";
import type { ArchiveEntryPreview } from "@/types/archive";

function entry(id: number, title: string): ArchiveEntryPreview {
  return {
    id,
    slug: `e-${id}`,
    title,
    category: "location",
    tags: [],
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

const ENTRIES = [entry(1, "Erde"), entry(2, "Mars"), entry(3, "Erdorbit")];

describe("ArchiveEntryList – Titel-Filter", () => {
  it("zeigt zunächst alle Einträge", () => {
    render(<ArchiveEntryList entries={ENTRIES} />);
    expect(screen.getByText("Erde")).toBeInTheDocument();
    expect(screen.getByText("Mars")).toBeInTheDocument();
    expect(screen.getByText("Erdorbit")).toBeInTheDocument();
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
