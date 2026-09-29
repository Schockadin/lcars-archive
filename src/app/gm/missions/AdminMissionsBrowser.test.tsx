import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AdminMissionsBrowser from "./AdminMissionsBrowser";

const MISSIONS = [
  { id: 1, slug: "deneb", title: "Deneb IV", status: "active" as const, startedAt: "2400-05-12", isDraft: false, ownerId: 1, ownerName: "GM" },
  { id: 2, slug: "kestrel", title: "Kestrel", status: "completed" as const, startedAt: "2400-06-02", isDraft: false, ownerId: 1, ownerName: "GM" },
];

describe("AdminMissionsBrowser", () => {
  it("bietet das Anlegen und Gruppieren nach Missionsstatus an", () => {
    render(<AdminMissionsBrowser missions={MISSIONS} />);

    expect(screen.getByRole("link", { name: "Neue Mission" })).toHaveAttribute("href", "/user/missions/new");
    fireEvent.change(screen.getByLabelText("Gruppieren nach"), { target: { value: "status" } });

    expect(screen.getByRole("heading", { name: "Aktiv" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Abgeschlossen" })).toBeInTheDocument();
  });

  it("sortiert Missionskarten nach Status", () => {
    render(<AdminMissionsBrowser missions={MISSIONS} />);
    fireEvent.change(screen.getByLabelText("Sortieren nach"), { target: { value: "status" } });
    fireEvent.change(screen.getByLabelText("Reihenfolge"), { target: { value: "asc" } });

    expect([...document.querySelectorAll(".mission-akte-title")].map((node) => node.textContent)).toEqual([
      "Deneb IV",
      "Kestrel",
    ]);
  });
});
