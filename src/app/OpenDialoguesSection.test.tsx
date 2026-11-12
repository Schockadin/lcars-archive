import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OpenDialoguesSection from "./OpenDialoguesSection";
import type { DialogueSummary } from "@/lib/dialoguesCore";

const dialogue: DialogueSummary = {
  id: 1,
  slug: "raumstation",
  title: "Auf der Station",
  partnerNames: ["Kira", "Quark"],
  lastMessageCharacterName: "Spock",
  replyRightHolderName: "Jean-Luc Picard",
  updatedAt: "2400-05-02",
  logDate: null,
  open: true,
  characterSlug: "tuvok",
  characterName: "Tuvok",
  isDraft: false,
  ownerUserId: 7,
};

describe("OpenDialoguesSection", () => {
  it("zeigt den letzten Autor und die reservierende Person", () => {
    render(<OpenDialoguesSection items={[dialogue]} />);

    expect(screen.getByText("Kira, Quark")).toBeInTheDocument();
    expect(screen.getByText("Zuletzt geschrieben von")).toBeInTheDocument();
    expect(screen.getByText("Spock")).toBeInTheDocument();
    expect(
      screen.getByText("Antwortrecht reserviert von"),
    ).toBeInTheDocument();
    expect(screen.getByText("Jean-Luc Picard")).toBeInTheDocument();
  });
});
