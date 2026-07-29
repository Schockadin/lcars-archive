import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MissionsOverview from "./MissionsOverview";
import type { MissionPreview } from "@/types/missions";

function mission(id: number, title: string): MissionPreview {
  return {
    id,
    slug: `m-${id}`,
    title,
    status: "active",
    started_at: `2400-0${id}-01`,
    ended_at: null,
    metadata: { tags: [], body: null, teaser: null },
    log_count: 0,
    authors: [],
    isDraft: false,
  };
}

const MISSIONS = [
  mission(1, "Erste Mission"),
  mission(2, "Zweiter Einsatz"),
  mission(3, "Erste Rückkehr"),
];

describe("MissionsOverview – Titel-Filter", () => {
  it("zeigt zunächst alle Missionen", () => {
    render(<MissionsOverview missions={MISSIONS} />);
    expect(screen.getByText("Erste Mission")).toBeInTheDocument();
    expect(screen.getByText("Zweiter Einsatz")).toBeInTheDocument();
    expect(screen.getByText("Erste Rückkehr")).toBeInTheDocument();
  });

  it("grenzt case-insensitiv per Titel ein", () => {
    render(<MissionsOverview missions={MISSIONS} />);
    fireEvent.change(screen.getByLabelText("Missionen filtern"), {
      target: { value: "erste" },
    });
    expect(screen.getByText("Erste Mission")).toBeInTheDocument();
    expect(screen.getByText("Erste Rückkehr")).toBeInTheDocument();
    expect(screen.queryByText("Zweiter Einsatz")).toBeNull();
  });

  it("zeigt eine Leermeldung, wenn kein Titel passt", () => {
    render(<MissionsOverview missions={MISSIONS} />);
    fireEvent.change(screen.getByLabelText("Missionen filtern"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Keine Missionen für diese Filter."),
    ).toBeInTheDocument();
  });
});
