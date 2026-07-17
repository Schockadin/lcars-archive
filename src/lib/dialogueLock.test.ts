import { describe, it, expect } from "vitest";
import { canReplyToDialogue } from "./dialogueLock";

describe("canReplyToDialogue", () => {
  it("allows replying with exactly two participants, regardless of lock state", () => {
    expect(canReplyToDialogue(2, null, 1)).toBe(true);
    expect(canReplyToDialogue(2, { heldByUserId: 2 }, 1)).toBe(true);
  });

  it("allows replying with fewer than two participants (defensive)", () => {
    expect(canReplyToDialogue(1, null, 1)).toBe(true);
    expect(canReplyToDialogue(0, null, 1)).toBe(true);
  });

  it("blocks replying with more than two participants when nobody has reserved", () => {
    expect(canReplyToDialogue(3, null, 1)).toBe(false);
  });

  it("blocks replying with more than two participants when someone else holds the lock", () => {
    expect(canReplyToDialogue(3, { heldByUserId: 2 }, 1)).toBe(false);
  });

  it("allows replying with more than two participants when the viewer holds the lock", () => {
    expect(canReplyToDialogue(3, { heldByUserId: 1 }, 1)).toBe(true);
  });
});
