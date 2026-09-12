import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
      canCreateLog={false}
      {...props}
    />
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

    expect(
      screen.getByRole("heading", { level: 2, name: "Logbücher" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 Logbücher/)).toBeInTheDocument();
  });

  it("zählt ein einzelnes Logbuch im Singular", () => {
    renderOverview({ logs: [log(1, "Allein")] });

    expect(screen.getByText(/^1 Logbuch/)).toBeInTheDocument();
  });

  it("verlinkt jede Karte auf das Logbuch in dieser Mission", () => {
    renderOverview();

    expect(screen.getByRole("link", { name: /Erster Kontakt/ })).toHaveAttribute(
      "href",
      "/chronologie/mission/deneb-iv/log-1",
    );
  });

  it("zeigt Sitzungsnummer und Datum an der Karte", () => {
    const { container } = renderOverview();

    expect(container.querySelectorAll(".timeline-tag")).toHaveLength(3);
    expect(screen.getAllByText("11.09.2400").length).toBeGreaterThan(0);
  });

  it("gruppiert von Haus aus nach Autor", () => {
    const { container } = renderOverview();

    const groups = [...container.querySelectorAll(".timeline-period")].map(
      (node) => node.textContent,
    );
    expect(groups).toEqual(["T'Lara · 2", "Marcus Hale · 1"]);
    expect(screen.getByText(/nach Autor gruppiert/)).toBeInTheDocument();
  });

  it("sortiert auf Wunsch nach Datum und lässt die Gruppen fallen", () => {
    const { container } = renderOverview();
    const datum = screen.getByRole("button", { name: /Datum/ });

    // Erster Klick auf eine noch inaktive Option sortiert aufsteigend — das
    // ist die Regel von LcarsSortSwitch, die überall in der App gilt.
    fireEvent.click(datum);
    expect(container.querySelectorAll(".timeline-period")).toHaveLength(0);
    expect(
      [...container.querySelectorAll(".timeline-card-title")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["Erster Kontakt", "Rückzug", "Nachspiel"]);
    expect(screen.getByText(/älteste zuerst/)).toBeInTheDocument();

    // Ein weiterer Klick dreht die Richtung um.
    fireEvent.click(datum);
    expect(
      [...container.querySelectorAll(".timeline-tag")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["S-03", "S-02", "S-01"]);
    expect(screen.getByText(/neueste zuerst/)).toBeInTheDocument();
  });

  it("nennt den Autor in der Datums-Ansicht, nicht in den Gruppen", () => {
    const { container } = renderOverview();

    // Gruppiert steht der Name schon in der Überschrift.
    expect(container.querySelector(".timeline-card-meta")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Datum/ }));
    expect(container.querySelector(".timeline-card-meta")).toHaveTextContent(
      "Autor",
    );
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

  it("sagt Bescheid, wenn es keine Logbücher gibt", () => {
    const { container } = renderOverview({ logs: [] });

    expect(
      screen.getByText("Keine Logs zu dieser Mission erfasst."),
    ).toHaveClass("lcars-empty-state");
    // Ohne Einträge gibt es nichts zu sortieren.
    expect(container.querySelector(".mission-sort")).toBeNull();
  });
});
