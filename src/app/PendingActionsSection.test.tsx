import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PendingActionsSection from "./PendingActionsSection";
import type { PendingAction } from "@/lib/pendingActions";

const reply: PendingAction = {
  kind: "dialogue_reply",
  label: "Im Gespräch antworten",
  subject: "Auf der Station",
  href: "/dialogues/auf-der-station",
  since: "2400-05-02T12:00:00Z",
  lastMessageAuthorName: "Mira Beispiel",
};

describe("PendingActionsSection", () => {
  it("zeigt bei einer offenen Gesprächsantwort den letzten Nachrichtenautor", () => {
    render(<PendingActionsSection items={[reply]} />);

    expect(screen.getByText("Zuletzt geschrieben von")).toBeInTheDocument();
    expect(screen.getByText("Mira Beispiel")).toBeInTheDocument();
  });
});
