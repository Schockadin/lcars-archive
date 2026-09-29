import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MissionSummaryBlocks from "./MissionSummaryBlocks";

describe("MissionSummaryBlocks", () => {
  it("zeigt Summary-Blöcke in der übergebenen Reihenfolge und verlinkt ihre Sessions", () => {
    render(
      <MissionSummaryBlocks
        missionTitle="Deneb IV"
        blocks={[
          {
            id: 12,
            sessionId: 8,
            missionSessionNumber: 2,
            ingameDate: "2234-12-21",
            body: "Rückkehr",
            bodyHtml: "<p>Rückkehr</p>",
          },
          {
            id: 11,
            sessionId: 7,
            missionSessionNumber: 1,
            ingameDate: "2234-12-20",
            body: "Erster Kontakt",
            bodyHtml: "<p>Erster Kontakt</p>",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Deneb IV - Eintrag 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deneb IV - Eintrag 1" })).toBeInTheDocument();
    expect(screen.getByText("21.12.2234")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur zugehörigen Session" })).toHaveAttribute(
      "href",
      "#session-8",
    );
  });

  it("zeigt einen Hinweis, wenn noch keine Summary-Blöcke existieren", () => {
    render(<MissionSummaryBlocks missionTitle="Deneb IV" blocks={[]} />);

    expect(screen.getByText("Für diese Mission gibt es noch keine Summary-Blöcke.")).toBeInTheDocument();
  });
});
