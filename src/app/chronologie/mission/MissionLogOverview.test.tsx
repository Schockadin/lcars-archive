import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MissionLogOverview from "./MissionLogOverview";
import type { MissionLogListItem } from "@/types/missions";

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

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
    ownerUserId: 7,
    isDraft: false,
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
      missionTitle="Deneb IV"
      fullSynopsisHtml={null}
      logs={LOGS}
      synopsisBlocks={[]}
      canCreateLog={false}
      currentUserId={null}
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
    expect(screen.getByText(/3 Logeinträge chronologisch/)).toBeInTheDocument();
  });

  it("zählt ein einzelnes Logbuch im Singular", () => {
    renderOverview({ logs: [log(1, "Allein")] });

    expect(screen.getByText(/1 Logeintrag chronologisch/)).toBeInTheDocument();
  });

  it("verlinkt jede Karte auf das Logbuch in dieser Mission", () => {
    renderOverview();

    expect(
      screen.getByRole("link", { name: /Erster Kontakt/ }),
    ).toHaveAttribute("href", "/chronologie/mission/deneb-iv/log-1");
  });

  it("zeigt dem Eigentümer die Aktionen eines Missionslogs", () => {
    renderOverview({ currentUserId: 7 });

    fireEvent.click(screen.getAllByRole("button", { name: "Weitere Aktionen" })[0]);

    expect(screen.getByRole("menuitem", { name: "Bearbeiten" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Als Entwurf" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Löschen" })).toBeInTheDocument();
  });

  it("zeigt Sitzungsnummer und Datum an der Karte", () => {
    const { container } = renderOverview();

    expect(container.querySelectorAll(".timeline-tag")).toHaveLength(3);
    expect(screen.getAllByText("11.09.2400").length).toBeGreaterThan(0);
  });

  it("ordnet Logs und Synopsisblöcke gemeinsam chronologisch absteigend", () => {
    const { container } = renderOverview({
      logs: [log(1, "Log eins", "T'Lara", "2234-12-20"), log(2, "Log zwei", "T'Lara", "2234-12-21")],
      synopsisBlocks: [{ id: 7, sessionId: 8, missionSessionNumber: 8, missionBlockNumber: 8, ingameDate: "2234-12-20", body: "Zwischenfall", bodyHtml: "<p>Zwischenfall</p>" }],
    });
    expect(container.querySelectorAll(".timeline-period")).toHaveLength(0);
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(3);
    expect([...container.querySelectorAll(".timeline-card-title")].map((node) => node.textContent)).toEqual(["Log zwei", "Log eins", "20.12.2234"]);
    expect(screen.queryByText("Session: 20.12.2234 - Eintrag 8")).not.toBeInTheDocument();
    expect([...container.querySelectorAll(".timeline-tag")].map((node) => node.textContent)).toEqual([
      "Logbuch",
      "Logbuch",
      "Log-Eintrag",
    ]);
    const tocEntries = [...container.querySelectorAll(".lcars-toc-link")];
    expect(tocEntries.map((item) => item.textContent)).toEqual([
      "21.12.2234 · Log zwei",
      "20.12.2234 · Log eins",
      "20.12.2234",
      "Synopsis",
    ]);
    const summary = container.querySelector<HTMLElement>("#mission-synopsis-7")!;
    summary.scrollIntoView = vi.fn();
    fireEvent.click(tocEntries[2]);
    expect(summary.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getAllByText("20.12.2234").length).toBeGreaterThan(0);
  });

  it("zeigt die vollständige Synopsis nach der Chronik und verlinkt sie im ToC", () => {
    const { container } = renderOverview({
      synopsisBlocks: [{
        id: 7,
        sessionId: 8,
        missionSessionNumber: 8,
        missionBlockNumber: 8,
        ingameDate: "2234-12-20",
        body: "Zwischenfall",
        bodyHtml: "<p>Zwischenfall</p>",
      }],
      fullSynopsisHtml: "<h2>Synopsis 2234-12-20</h2><p>Veralteter Text.</p>",
    });

    const fullSynopsis = container.querySelector("#mission-full-synopsis");
    expect(fullSynopsis).toHaveTextContent("Synopsis");
    expect(fullSynopsis).toHaveTextContent("Zwischenfall");
    expect(fullSynopsis?.querySelector("h4")).toHaveTextContent("20.12.2234");
    expect(fullSynopsis).not.toHaveTextContent("Synopsis 2234-12-20");
    expect(fullSynopsis).not.toHaveTextContent("Veralteter Text");
    expect(container.querySelector(".mission-log-overview")?.lastElementChild).toBe(fullSynopsis);
    expect([...container.querySelectorAll(".lcars-toc-link")].map((item) => item.textContent)).toContain("Synopsis");
  });

  it("führt gleiche Synopsis-Daten zusammen und lässt die Karten einzeln", () => {
    const { container } = renderOverview({
      logs: [],
      synopsisBlocks: [7, 8].map((id) => ({
        id,
        sessionId: 8,
        missionSessionNumber: 8,
        missionBlockNumber: id,
        ingameDate: "2234-12-20",
        body: `Eintrag ${id}`,
        bodyHtml: `<p>Eintrag ${id}</p>`,
      })),
    });

    expect(container.querySelectorAll(".timeline-card")).toHaveLength(2);
    const fullSynopsis = container.querySelector<HTMLElement>(
      "#mission-full-synopsis",
    )!;
    expect(fullSynopsis.querySelectorAll("h4")).toHaveLength(1);
    expect(fullSynopsis.querySelector("h4")).toHaveTextContent("20.12.2234");
    expect(fullSynopsis).toHaveTextContent("Eintrag 7");
    expect(fullSynopsis).toHaveTextContent("Eintrag 8");
  });

  it("steuert Session-Inhalte mit einem wechselnden Textbutton neben dem ToC", () => {
    const { container } = renderOverview({ synopsisBlocks: [7, 8].map((id) => ({
      id, sessionId: 1, missionSessionNumber: 1, missionBlockNumber: id,
      ingameDate: `2234-12-0${id}`, body: "Bericht", bodyHtml: "<p>Bericht</p>",
    })) });
    const panels = [...container.querySelectorAll<HTMLDetailsElement>("[data-session-panel]")];
    expect(panels).toHaveLength(2);
    expect(panels.every((panel) => panel.open)).toBe(true);
    const toggle = screen.getByRole("button", { name: "Alle Session-Panels schließen" });
    expect(screen.getAllByRole("button", { name: /Alle Session-Panels/ })).toHaveLength(1);
    expect(toggle).toHaveTextContent("−");
    expect(toggle.querySelector("svg")).toBeNull();
    expect(toggle).not.toHaveClass("lcars-icon-btn");
    fireEvent.click(toggle);
    expect(panels.every((panel) => !panel.open)).toBe(true);
    expect(toggle).toHaveTextContent("+");
    expect(toggle).toHaveAccessibleName("Alle Session-Panels öffnen");
    fireEvent.click(toggle);
    expect(panels.every((panel) => panel.open)).toBe(true);
    expect(toggle).toHaveTextContent("−");
    fireEvent.click(toggle);
    const target = container.querySelector<HTMLElement>("#mission-synopsis-7")!;
    target.scrollIntoView = vi.fn();
    const blockEntry = [...container.querySelectorAll(".lcars-toc-link")].find(
      (item) => item.textContent === "07.12.2234",
    )!;
    fireEvent.click(blockEntry);
    expect(target.querySelector("details")).toHaveAttribute("open");
    expect(container.querySelector("#mission-synopsis-8 details")).not.toHaveAttribute("open");
    expect(toggle).toHaveTextContent("+");
    fireEvent.click(toggle);
    expect(panels.every((panel) => panel.open)).toBe(true);
    expect(toggle).toHaveTextContent("−");
  });

  it("erhält eine alte Synopsis, wenn noch keine Session-Blöcke vorhanden sind", () => {
    renderOverview({ fullSynopsisHtml: "<p>Historische Zusammenfassung.</p>" });
    expect(screen.getByText("Historische Zusammenfassung.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Session-Panels" })).not.toBeInTheDocument();
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

    expect(screen.getByText("Noch keine Logs oder Session-Einträge vorhanden.")).toHaveClass("lcars-empty-state");
    expect(container.querySelector(".mission-sort")).toBeNull();
  });
});
