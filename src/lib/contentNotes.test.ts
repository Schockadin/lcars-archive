import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: () => Promise.resolve([]) }));

const {
  isNoteContentType,
  isNoteVisibility,
  normalizeNoteBody,
  NOTE_CONTENT_TYPES,
  NOTE_VISIBILITIES,
  NOTE_MAX_LENGTH,
} = await import("./contentNotes");

describe("Typen und Sichtbarkeiten", () => {
  it("kennt genau die vier Inhaltsarten", () => {
    expect([...NOTE_CONTENT_TYPES]).toEqual([
      "character",
      "mission",
      "mission_log",
      "archive",
    ]);
    expect(isNoteContentType("character")).toBe(true);
    expect(isNoteContentType("dialogue")).toBe(false);
    expect(isNoteContentType("")).toBe(false);
  });

  it("kennt genau zwei Sichtbarkeiten", () => {
    expect([...NOTE_VISIBILITIES]).toEqual(["private", "group"]);
    expect(isNoteVisibility("private")).toBe(true);
    expect(isNoteVisibility("public")).toBe(false);
  });
});

describe("normalizeNoteBody", () => {
  it("trimmt und vereinheitlicht Zeilenenden", () => {
    expect(normalizeNoteBody("  Hallo\r\nWelt  ")).toBe("Hallo\nWelt");
  });

  it("verwirft leere Eingaben", () => {
    expect(normalizeNoteBody("")).toBeNull();
    expect(normalizeNoteBody("   \n  ")).toBeNull();
  });

  it("kappt überlange Texte auf die Obergrenze", () => {
    const long = "x".repeat(NOTE_MAX_LENGTH + 500);
    expect(normalizeNoteBody(long)?.length).toBe(NOTE_MAX_LENGTH);
  });

  it("lässt normalen Text unverändert", () => {
    expect(normalizeNoteBody("Kurze Notiz.")).toBe("Kurze Notiz.");
  });
});
