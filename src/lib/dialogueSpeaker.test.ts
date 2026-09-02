import { describe, it, expect } from "vitest";
import { parseSpeakerKey, sameSpeaker, speakerKey } from "./dialogueSpeaker";

describe("dialogueSpeaker", () => {
  it("bildet und liest den Schlüssel beider Sprecher-Sorten", () => {
    expect(speakerKey({ kind: "character", id: 12 })).toBe("c12");
    expect(speakerKey({ kind: "npc", id: 7 })).toBe("n7");
    expect(parseSpeakerKey("c12")).toEqual({ kind: "character", id: 12 });
    expect(parseSpeakerKey(" n7 ")).toEqual({ kind: "npc", id: 7 });
  });

  it("weist Unsinn aus dem Formular zurück", () => {
    for (const bad of ["", "12", "x12", "c", "c0", "c-3", "c1.5", "cabc"]) {
      expect(parseSpeakerKey(bad)).toBeNull();
    }
  });

  it("hält Charakter und NPC mit derselben ID auseinander", () => {
    const character = { kind: "character" as const, id: 7 };
    const npc = { kind: "npc" as const, id: 7 };
    expect(sameSpeaker(character, { ...character })).toBe(true);
    expect(sameSpeaker(character, npc)).toBe(false);
    expect(sameSpeaker(null, npc)).toBe(false);
  });
});
