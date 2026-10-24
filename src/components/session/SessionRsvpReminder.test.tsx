import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SessionRsvpReminder from "./SessionRsvpReminder";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

describe("SessionRsvpReminder", () => {
  it("zeigt die kurze Erinnerungsbeschriftung mit Anzahl", () => {
    render(<SessionRsvpReminder sessionId={12} unansweredCount={3} />);

    expect(
      screen.getByRole("button", { name: "Erinnern (3)" }),
    ).toBeInTheDocument();
  });
});
