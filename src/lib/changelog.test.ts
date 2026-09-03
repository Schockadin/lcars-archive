import { describe, it, expect } from "vitest";
import { CHANGELOG, latestChangelogEntry } from "./changelog";

describe("latestChangelogEntry", () => {
  it("liefert den Eintrag mit der höchsten Version", () => {
    const entry = latestChangelogEntry([
      { version: "1.9", title: "alt", items: ["a"] },
      { version: "1.10", title: "neu", items: ["b"] },
      { version: "1.2", title: "älter", items: ["c"] },
    ]);
    expect(entry?.version).toBe("1.10");
  });

  it("vergleicht Stellen numerisch statt lexikografisch", () => {
    // Rein lexikografisch stünde "1.9" hinter "1.10" — genau der Fall, der
    // die Reihenfolge auf dem Dashboard verdrehen würde.
    const entry = latestChangelogEntry([
      { version: "1.10", title: "neu", items: [] },
      { version: "1.9", title: "alt", items: [] },
    ]);
    expect(entry?.version).toBe("1.10");
  });

  it("gibt null zurück, wenn es keine Einträge gibt", () => {
    expect(latestChangelogEntry([])).toBeNull();
  });

  it("findet im echten Changelog einen Eintrag", () => {
    const entry = latestChangelogEntry();
    expect(entry).not.toBeNull();
    expect(CHANGELOG.map((e) => e.version)).toContain(entry?.version);
    expect(entry?.items.length).toBeGreaterThan(0);
  });
});
