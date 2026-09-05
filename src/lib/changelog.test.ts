import { describe, it, expect } from "vitest";
import {
  CHANGELOG,
  latestChangelogEntry,
  changelogItemText,
  changelogItemTutorial,
  changelogVersionExists,
  featuredChangelogEntries,
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

describe("changelogVersionExists", () => {
  const entries = [
    { version: "1.9", title: "a", items: [] },
    { version: "1.10", title: "b", items: [] },
  ];

  it("erkennt vorhandene und unbekannte Versionen", () => {
    expect(changelogVersionExists("1.10", entries)).toBe(true);
    expect(changelogVersionExists("1.9", entries)).toBe(true);
    expect(changelogVersionExists("2.0", entries)).toBe(false);
    expect(changelogVersionExists("", entries)).toBe(false);
  });

  it("prüft gegen den echten Changelog", () => {
    expect(changelogVersionExists(CHANGELOG[0].version)).toBe(true);
    expect(changelogVersionExists("0.0")).toBe(false);
  });
});

describe("featuredChangelogEntries", () => {
  const entries = [
    { version: "1.9", title: "alt", items: ["a"] },
    { version: "1.10", title: "neu", items: ["b", "c"] },
    { version: "1.2", title: "älter", items: ["d"] },
  ];

  it("null (nicht konfiguriert) ⇒ nur die jüngste Version", () => {
    const result = featuredChangelogEntries(null, entries);
    expect(result.map((e) => e.version)).toEqual(["1.10"]);
  });

  it("leeres Array ⇒ nichts (Box verschwindet)", () => {
    expect(featuredChangelogEntries([], entries)).toEqual([]);
  });

  it("gewählte Versionen, neueste zuerst, Unbekanntes verworfen", () => {
    const result = featuredChangelogEntries(["1.2", "1.10", "9.9"], entries);
    expect(result.map((e) => e.version)).toEqual(["1.10", "1.2"]);
  });

  it("gibt für leeren Changelog auch bei null nichts zurück", () => {
    expect(featuredChangelogEntries(null, [])).toEqual([]);
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
