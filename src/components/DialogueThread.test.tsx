import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import DialogueThread from "./DialogueThread";
import type { DialogueMessage } from "@/lib/dialoguesCore";
import type { ArchiveParticipant } from "@/types/archive";

// Die Nachrichten-Aktionen (Bearbeiten/Löschen) hängen an Server Actions und
// haben mit der Darstellung des Zeitstempels nichts zu tun.
vi.mock("./DialogueMessageActions", () => ({
  default: () => null,
}));

// jsdom kennt scrollIntoView nicht; im laufenden Gespräch springt
// DialogueThread beim Mounten aber ans Ende (siehe Effect dort).
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const PARTICIPANTS: ArchiveParticipant[] = [
  { slug: "ada", name: "Ada", kind: "character" },
  { slug: "bo", name: "Bo", kind: "character" },
];

function message(overrides: Partial<DialogueMessage> = {}): DialogueMessage {
  return {
    id: 1,
    speaker: { kind: "character", id: 1 },
    characterId: 1,
    characterSlug: "ada",
    characterName: "Ada",
    authorUserId: 7,
    content: "<p>Hallo</p>",
    // Postgres-Schreibweise (TIMESTAMPTZ::text), genau wie sie
    // getDialogueMessages liefert.
    createdAt: "2026-09-16 10:00:00+00",
    editedAt: null,
    deletedAt: null,
    characterColor: "#ff9900",
    ...overrides,
  };
}

describe("DialogueThread", () => {
  it("zeigt im laufenden Gespräch, wann die Nachricht verschickt wurde", () => {
    render(
      <DialogueThread
        messages={[message()]}
        participants={PARTICIPANTS}
        dialogueOpen
        entrySlug="ein-gespraech"
      />,
    );

    // 10:00 UTC ist im September 12:00 Uhr in Berlin.
    const stamp = screen.getByText("16.09.2026, 12:00");
    expect(stamp.tagName).toBe("TIME");
    // Maschinenlesbar echtes ISO 8601, nicht die Postgres-Schreibweise.
    expect(stamp).toHaveAttribute("datetime", "2026-09-16T10:00:00.000Z");
  });

  it("zeigt den Zeitstempel im abgeschlossenen Gespräch nicht", () => {
    render(
      <DialogueThread
        messages={[message()]}
        participants={PARTICIPANTS}
        entrySlug="ein-gespraech"
      />,
    );

    expect(screen.queryByText("16.09.2026, 12:00")).toBeNull();
  });

  it("zeigt Zeitstempel und „bearbeitet“ nebeneinander", () => {
    render(
      <DialogueThread
        messages={[message({ editedAt: "2026-09-16 11:00:00+00" })]}
        participants={PARTICIPANTS}
        dialogueOpen
        entrySlug="ein-gespraech"
      />,
    );

    expect(screen.getByText("16.09.2026, 12:00")).toBeTruthy();
    expect(screen.getByText("bearbeitet")).toBeTruthy();
  });
});
