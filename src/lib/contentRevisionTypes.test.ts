import { describe, it, expect } from "vitest";
import {
  REVISION_CONTENT_TYPES,
  REVISION_EXCERPT_LENGTH,
  isRevisionContentType,
  revisionExcerpt,
} from "./contentRevisionTypes";

describe("isRevisionContentType", () => {
  it("akzeptiert genau die vier Inhaltsarten", () => {
    for (const t of REVISION_CONTENT_TYPES) expect(isRevisionContentType(t)).toBe(true);
  });

  it("weist alles andere ab", () => {
    expect(isRevisionContentType("dialogue")).toBe(false);
    expect(isRevisionContentType("")).toBe(false);
    expect(isRevisionContentType("archive_entry")).toBe(false);
  });
});

describe("revisionExcerpt", () => {
  it("macht aus Zeilenumbrüchen und Mehrfach-Leerzeichen eine Zeile", () => {
    expect(revisionExcerpt("Erste Zeile\n\n  Zweite   Zeile ")).toBe(
      "Erste Zeile Zweite Zeile",
    );
  });

  it("lässt kurzen Text unverändert (ohne Auslassungszeichen)", () => {
    expect(revisionExcerpt("kurz")).toBe("kurz");
  });

  it("kürzt langen Text auf die Höchstlänge inklusive Auslassungszeichen", () => {
    const out = revisionExcerpt("a".repeat(500));
    expect(out.length).toBe(REVISION_EXCERPT_LENGTH);
    expect(out.endsWith("…")).toBe(true);
  });

  it("respektiert eine eigene Höchstlänge", () => {
    expect(revisionExcerpt("abcdefghij", 5)).toBe("abcd…");
  });

  it("lässt am Kürzungsrand kein Leerzeichen vor dem Auslassungszeichen stehen", () => {
    expect(revisionExcerpt("abcd efgh", 6)).toBe("abcd…");
  });

  it("kommt mit leerem Text zurecht", () => {
    expect(revisionExcerpt("   \n  ")).toBe("");
  });
});
