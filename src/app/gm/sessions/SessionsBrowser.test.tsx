import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { GameSession } from "@/lib/gameSessions";
import SessionsBrowser from "./SessionsBrowser";

function session(id: number, missionId: number, date: string): GameSession {
  const missionTitle = missionId === 1 ? "Deneb IV" : "Kestrel";
  return {
    id, missionId, missionTitle, missionSlug: `mission-${missionId}`,
    title: `${missionTitle} ${id}`, missionSessionNumber: id, sessionDate: date,
    sessionAp: 3, bonusAp: 1, createdByName: "GM", createdAt: date,
    characterCount: 1, totalAp: 4, characterIds: [7],
    synopsisBlocks: [{ id, blockOrder: 1, missionBlockNumber: id,
      ingameDate: "2400-05-12", body: `Zwischenfall ${id}`, bodyHtml: `<p>Zwischenfall ${id}</p>` }],
  };
}

const SESSIONS = [session(1, 1, "2026-09-01"), session(2, 2, "2026-09-05"), session(3, 1, "2026-09-10")];

describe("SessionsBrowser", () => {
  it("zeigt in einer Mission dieselben Detailkarten ohne zusätzliche Missionsauswahl", () => {
    const { container } = render(<SessionsBrowser sessions={SESSIONS.filter((item) => item.missionId === 1)} heading="Sessions" groupByMission={false} />);
    expect(screen.getByRole("heading", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Mission filtern")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(2);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/gm/sessions/3", "/gm/sessions/1"]);
  });

  it("gruppiert gemeinsame Chronologie-Karten nach Mission, neueste Session zuerst", () => {
    const { container } = render(<SessionsBrowser sessions={SESSIONS} />);
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(3);
    expect(container.querySelectorAll(".timeline-event")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["Deneb IV", "Kestrel"]);
    const deneb = screen.getByRole("region", { name: "Deneb IV" });
    expect(within(deneb).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/gm/sessions/3", "/gm/sessions/1"]);
    expect(container.querySelectorAll("details")).toHaveLength(0);
  });

  it("kombiniert Missionsfilter mit der Suche nach Summary-Text und deutschem Datum", () => {
    render(<SessionsBrowser sessions={SESSIONS} />);
    fireEvent.change(screen.getByLabelText("Mission filtern"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Session suchen"), { target: { value: "Zwischenfall 3" } });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Deneb IV 3" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Session suchen"), { target: { value: "01.09.2026" } });
    expect(screen.getByRole("link", { name: "Deneb IV 1" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Deneb IV 3" })).not.toBeInTheDocument();
  });

  it("unterscheidet einen leeren Bestand von einer Suche ohne Treffer", () => {
    const { rerender } = render(<SessionsBrowser sessions={[]} />);
    expect(screen.getByText("Noch keine Session eingetragen.")).toBeInTheDocument();
    rerender(<SessionsBrowser sessions={SESSIONS} />);
    fireEvent.change(screen.getByLabelText("Session suchen"), { target: { value: "Unbekannt" } });
    expect(screen.getByText("Keine Sessions für diese Suche.")).toBeInTheDocument();
  });

  it("zeigt historische Sessions ohne Mission weiterhin an", () => {
    render(<SessionsBrowser sessions={[{ ...SESSIONS[0], missionId: null, missionTitle: null, missionSlug: null }]} />);
    fireEvent.change(screen.getByLabelText("Mission filtern"), { target: { value: "none" } });
    expect(screen.getByRole("region", { name: "Ohne Mission" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/gm/sessions/1");
  });
});
