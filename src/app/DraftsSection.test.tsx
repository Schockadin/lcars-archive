import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DraftsSection from "./DraftsSection";
import type { DraftItem } from "@/lib/drafts";

const LOG: DraftItem = {
  kind: "mission_log",
  id: 7,
  slug: "log-vom-rand",
  title: "Der Abend am Rand",
  updatedAt: "2401-05-12T10:00:00Z",
  href: "/user/mission-logs/7/edit",
};

describe("DraftsSection", () => {
  it("führt jeden Entwurf direkt in seinen Editor", () => {
    render(<DraftsSection drafts={[LOG]} />);

    // Nicht auf die Leseseite: Die gibt es für einen Entwurf außer für
    // seinen Besitzer gar nicht, und weiterschreiben ist das, was man will.
    const link = screen.getAllByRole("link")[0];
    expect(link).toHaveAttribute("href", "/user/mission-logs/7/edit");
    expect(screen.getByText("Der Abend am Rand")).toBeInTheDocument();
  });

  it("nennt Art und letzten Stand", () => {
    render(<DraftsSection drafts={[LOG]} />);

    expect(screen.getByText("Missionslog")).toBeInTheDocument();
    expect(screen.getByText("12.05.2401")).toBeInTheDocument();
  });

  it("zählt die Entwürfe in der Kopfzeile", () => {
    render(
      <DraftsSection
        drafts={[LOG, { ...LOG, id: 8, kind: "dialogue", title: "Zweiter" }]}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // Nichts offen zu haben ist keine Meldung wert — der Abschnitt
  // verschwindet, statt einen leeren Kasten zu zeigen.
  it("verschwindet ganz, wenn nichts offen ist", () => {
    const { container } = render(<DraftsSection drafts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("steht per Vorgabe offen", () => {
    render(<DraftsSection drafts={[LOG]} />);
    expect(document.querySelector("details")?.open).toBe(true);
  });
});
