import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getAllOpenDialoguesForGM } = vi.hoisted(() => ({
  getAllOpenDialoguesForGM: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({
  requireGM: vi.fn(async () => ({ id: 1 })),
  getRoleMap: vi.fn(async () => new Map()),
}));
vi.mock("@/lib/permissions", () => ({ userCan: vi.fn(() => false) }));
vi.mock("@/lib/dialogues", () => ({ getAllOpenDialoguesForGM }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/components/help/HelpHeading", () => ({ default: () => null }));
vi.mock("@/components/help/guides/GmGuides", () => ({
  GmDialoguesGuide: () => null,
}));

import AdminDialoguesPage from "./page";

describe("GM-Dialogübersicht", () => {
  it("zeigt die Person mit reserviertem Antwortrecht", async () => {
    getAllOpenDialoguesForGM.mockResolvedValue([
      {
        id: 1,
        slug: "kantine",
        title: "Abend in der Kantine",
        participantNames: ["Tuvok", "Kira", "Quark"],
        lastMessageCharacterName: "Kira",
        replyRightHolderName: "Jean-Luc Picard",
        updatedAt: "2026-11-12T10:00:00.000Z",
        ownerName: "Tuvok",
      },
    ]);

    render(await AdminDialoguesPage());

    expect(screen.getByText("Zuletzt geschrieben von")).toBeInTheDocument();
    expect(screen.getByText("Kira")).toBeInTheDocument();
    expect(
      screen.getByText("Antwortrecht reserviert von"),
    ).toBeInTheDocument();
    expect(screen.getByText("Jean-Luc Picard")).toBeInTheDocument();
  });
});
