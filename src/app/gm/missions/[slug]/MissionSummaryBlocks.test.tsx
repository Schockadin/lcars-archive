import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MissionSummaryBlocks from "./MissionSummaryBlocks";

vi.mock("./actions", () => ({
  deleteMissionSummaryBlockAction: vi.fn(),
  updateMissionSummaryBlockAction: vi.fn(),
}));

describe("MissionSummaryBlocks", () => {
  it("zeigt Summary-Blöcke in der übergebenen Reihenfolge und verlinkt ihre Sessions", () => {
    render(
      <MissionSummaryBlocks
        missionSlug="deneb-iv"
        missionTitle="Deneb IV"
        blocks={[
          {
            id: 12,
            sessionId: 8,
            missionSessionNumber: 2,
            missionBlockNumber: 2,
            ingameDate: "2234-12-21",
            body: "Rückkehr",
            bodyHtml: "<p>Rückkehr</p>",
          },
          {
            id: 11,
            sessionId: 7,
            missionSessionNumber: 1,
            missionBlockNumber: 1,
            ingameDate: "2234-12-20",
            body: "Erster Kontakt",
            bodyHtml: "<p>Erster Kontakt</p>",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Deneb IV - Eintrag 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Deneb IV - Eintrag 1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("21.12.2234")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zur zugehörigen Session" }),
    ).toHaveAttribute("href", "#session-8");
    expect(screen.getAllByRole("button", { name: "Summary-Block bearbeiten" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Summary-Block löschen" })).toHaveLength(2);
  });

  it("öffnet Datum und Markdown-Text zum Bearbeiten eines Blocks", () => {
    const { container } = render(
      <MissionSummaryBlocks
        missionSlug="deneb-iv"
        missionTitle="Deneb IV"
        blocks={[
          {
            id: 12,
            sessionId: 8,
            missionSessionNumber: 2,
            missionBlockNumber: 2,
            ingameDate: "2234-12-21",
            body: "Rückkehr",
            bodyHtml: "<p>Rückkehr</p>",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Summary-Block bearbeiten" }));

    expect(container.querySelector('input[name="ingameDate"]')).toHaveValue(
      "2234-12-21",
    );
    expect(
      container.querySelector('textarea[name="bodyMarkdown"]'),
    ).toHaveValue("Rückkehr");
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });

  it("zeigt einen Hinweis, wenn noch keine Summary-Blöcke existieren", () => {
    render(
      <MissionSummaryBlocks
        missionSlug="deneb-iv"
        missionTitle="Deneb IV"
        blocks={[]}
      />,
    );

    expect(screen.getByText("Für diese Mission gibt es noch keine Summary-Blöcke.")).toBeInTheDocument();
  });
});
