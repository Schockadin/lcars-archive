import { describe, it, expect } from "vitest";
import {
  CHANGELOG,
  latestChangelogEntry,
  changelogItemText,
  changelogItemTutorial,
} from "./changelog";
import { TUTORIAL_SECTIONS, tutorialSectionHref } from "./tutorialSections";

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

describe("changelog item helpers", () => {
  it("liest den Text aus String- und Objekt-Items", () => {
    expect(changelogItemText("nur Text")).toBe("nur Text");
    expect(changelogItemText({ text: "mit Objekt" })).toBe("mit Objekt");
  });

  it("liest den optionalen Tutorial-Link aus", () => {
    expect(changelogItemTutorial("nur Text")).toBeUndefined();
    expect(changelogItemTutorial({ text: "x" })).toBeUndefined();
    expect(
      changelogItemTutorial({ text: "x", tutorial: "eigene-inhalte" }),
    ).toBe("eigene-inhalte");
  });
});

describe("Changelog-Tutorial-Verlinkung", () => {
  const validIds = new Set(TUTORIAL_SECTIONS.map((s) => s.id));

  it("verlinkt nur auf existierende Tutorial-Abschnitte", () => {
    for (const entry of CHANGELOG) {
      for (const item of entry.items) {
        const tutorial = changelogItemTutorial(item);
        if (tutorial !== undefined) {
          expect(validIds.has(tutorial)).toBe(true);
        }
      }
    }
  });

  it("baut den Deep-Link als /tutorial#<id>", () => {
    expect(tutorialSectionHref("gespraeche")).toBe("/tutorial#gespraeche");
  });
});
