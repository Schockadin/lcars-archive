import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { PlannedSession } from "@/lib/plannedSessionTypes";
import UpcomingSessionsSection from "./UpcomingSessionsSection";

vi.mock("@/components/lcars", () => ({
  LcarsCollapsiblePanel: ({
    title,
    badge,
    children,
  }: {
    title: string;
    badge: ReactNode;
    children: ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <div>{badge}</div>
      {children}
    </section>
  ),
}));
vi.mock("@/components/session/SessionRsvp", () => ({
  default: () => <div>Zu- und Absage</div>,
}));
vi.mock("@/components/session/SessionRsvpReminder", () => ({
  default: ({ unansweredCount }: { unansweredCount: number }) => (
    <button type="button">
      Erinnern ({unansweredCount})
    </button>
  ),
}));

function termin(): PlannedSession {
  return {
    id: 12,
    scheduledAt: "2026-12-12 19:30",
    title: "Nebel von Ceti 1",
    missionId: 5,
    missionTitle: "Nebel von Ceti",
    missionSessionNumber: 1,
    location: "Bei Anna",
    notes: "",
    notesHtml: "",
    createdByName: "Spielleitung",
    characterIds: [4, 8],
    gameSessionId: null,
    rsvps: [
      { userId: 1, userName: "Anna", response: "yes", note: "" },
      { userId: 2, userName: "Bert", response: "no", note: "" },
    ],
    participants: [
      { userId: 1, userName: "Anna", response: "yes" },
      { userId: 2, userName: "Bert", response: "no" },
      { userId: 3, userName: "Cleo", response: null },
    ],
  };
}

describe("UpcomingSessionsSection", () => {
  it("zeigt die farbigen Rückmeldungszahlen und alle Antwortnamen", () => {
    render(
      <UpcomingSessionsSection
        sessions={[termin()]}
        userId={1}
        canRsvp={false}
        canRemind={false}
      />,
    );

    const badge = screen.getByLabelText(
      "1 zugesagt, 1 abgesagt, 1 ohne Rückmeldung",
    );
    expect(badge.querySelector(".text-lcars-senary-ink")).toHaveTextContent("1");
    expect(badge.querySelector(".text-lcars-quinary-ink")).toHaveTextContent("1");
    expect(badge.querySelector(".text-lcars-tertiary-ink")).toHaveTextContent("1");
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Bert")).toBeInTheDocument();
    expect(screen.getByText("Cleo")).toBeInTheDocument();
    expect(screen.getByText("Abgesagt")).toBeInTheDocument();
    expect(screen.getByText("Noch keine Rückmeldung")).toBeInTheDocument();
    expect(
      screen.queryByText(/Personen ohne Rückmeldung erinnern/),
    ).not.toBeInTheDocument();
  });

  it("bietet die E-Mail-Erinnerung nur der Spielleitung an", () => {
    render(
      <UpcomingSessionsSection
        sessions={[termin()]}
        userId={9}
        canRsvp
        canRemind
      />,
    );

    expect(
      screen.getByText("Erinnern (1)"),
    ).toBeInTheDocument();
  });
});
