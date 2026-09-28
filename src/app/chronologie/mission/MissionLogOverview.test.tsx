import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MissionLogOverview from "./MissionLogOverview";
import type { MissionLogListItem } from "@/types/missions";

function log(
  id: number,
  title: string,
  author: string | null = "T'Lara",
  date = `2400-09-1${id}`,
): MissionLogListItem {
  return {
    id,
    slug: `log-${id}`,
    title,
    session_nr: id,
    log_date: date,
    author_name: author,
    author_slug: author ? author.toLowerCase().replace(/\W/g, "-") : null,
  };
}

const LOGS = [
  log(1, "Erster Kontakt"),
  log(2, "Rückzug", "Marcus Hale"),
  log(3, "Nachspiel"),
];

function renderOverview(
  props: Partial<Parameters<typeof MissionLogOverview>[0]> = {},
) {
  return render(
    <MissionLogOverview
      missionSlug="deneb-iv"
      logs={LOGS}
      synopsisBlocks={[]}
      canCreateLog={false}
      {...props}
    />,
  );
}

describe("MissionLogOverview", () => {
  it("nutzt dieselbe Zeile und Karte wie Chronologie und Datenbank", () => {
    const { container } = renderOverview();

    // ChronoRow + ChronoCard — nicht mehr die alten Balken-Zeilen.
    expect(container.querySelectorAll(".timeline-event")).toHaveLength(3);
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(3);
    expect(container.querySelector(".mission-log-entry")).toBeNull();
  });

  it("trägt Überschrift und Anzahl", () => {
    renderOverview();

    expect(screen.getByRole("heading", { level: 2, name: "Missionschronik" })).toBeInTheDocument();
    expect(screen.getByText(/3 Logs · 0 Synopsis-Blöcke/)).toBeInTheDocument();
  });

  it("zählt ein einzelnes Logbuch im Singular", () => {
    renderOverview({ logs: [log(1, "Allein")] });

    expect(screen.getByText(/1 Log · 0 Synopsis-Block/)).toBeInTheDocument();
  });

  it("verlinkt jede Karte auf das Logbuch in dieser Mission", () => {
    renderOverview();

    expect(
      screen.getByRole("link", { name: /Erster Kontakt/ }),
    ).toHaveAttribute("href", "/chronologie/mission/deneb-iv/log-1");
  });

  it("zeigt Sitzungsnummer und Datum an der Karte", () => {
    const { container } = renderOverview();

    expect(container.querySelectorAll(".timeline-tag")).toHaveLength(3);
    expect(screen.getAllByText("11.09.2400").length).toBeGreaterThan(0);
  });

  it("ordnet Logs und Synopsisblöcke gemeinsam chronologisch absteigend", () => {
    const { container } = renderOverview({
      logs: [log(1, "Log eins", "T'Lara", "2234-12-20"), log(2, "Log zwei", "T'Lara", "2234-12-21")],
      synopsisBlocks: [{ id: 7, sessionId: 8, sessionTitle: "Session 8", ingameDate: "2234-12-20", endDate: null, body: "Zwischenfall", bodyHtml: "<p>Zwischenfall</p>" }],
    });
    expect(container.querySelectorAll(".timeline-period")).toHaveLength(0);
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(3);
    expect([...container.querySelectorAll(".timeline-card-title")].map((node) => node.textContent)).toEqual(["Log zwei", "Log eins", "Session 8"]);
    expect(screen.getByText("Session 8")).toBeInTheDocument();
    expect(screen.getAllByText("20.12.2234").length).toBeGreaterThan(0);
  });

  it("bietet „Neues Log“ nur an, wenn der Betrachter teilnimmt", () => {
    renderOverview();
    expect(screen.queryByRole("link", { name: "Neues Log" })).toBeNull();

    renderOverview({ canCreateLog: true });
    expect(screen.getByRole("link", { name: "Neues Log" })).toHaveAttribute(
      "href",
      "/user/mission-logs/new?mission=deneb-iv",
    );
  });

  it("sagt Bescheid, wenn es keine Logs oder Synopsis-Einträge gibt", () => {
    const { container } = renderOverview({ logs: [] });

    expect(screen.getByText("Noch keine Logs oder Synopsis-Einträge vorhanden.")).toHaveClass("lcars-empty-state");
    expect(container.querySelector(".mission-sort")).toBeNull();
  });
});
