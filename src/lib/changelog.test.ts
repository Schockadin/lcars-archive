import { describe, it, expect } from "vitest";
import {
  CHANGELOG,
  latestChangelogEntry,
  changelogCategoriesPresent,
  changelogItemCategory,
  changelogItemText,
  changelogItemTutorial,
  changelogVersionExists,
  missingChangelogVersions,
  CHANGELOG_KNOWN_GAPS,
  featuredChangelogEntries,
  filterChangelogEntries,
  hideChangelogCategories,
  sortChangelogItemsByCategory,
  type ChangelogEntry,
} from "./changelog";
import { isChangelogCategory } from "./changelogCategories";

// Zwei kleine Versionen für die Kategorie-Helfer — an echten Daten wären die
// Erwartungen bei jedem neuen Eintrag hinfällig.
const TEST_ENTRIES: ChangelogEntry[] = [
  {
    version: "2.0",
    title: "Zwei",
    items: [{ text: "A", category: "inhalte" }],
  },
  {
    version: "2.1",
    title: "Zwei-Eins",
    items: [
      { text: "B", category: "charaktere" },
      { text: "C", category: "inhalte" },
    ],
  },
];
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
    expect(
      changelogItemText({ text: "mit Objekt", category: "inhalte" }),
    ).toBe("mit Objekt");
  });

  it("liest den optionalen Tutorial-Link aus", () => {
    expect(changelogItemTutorial("nur Text")).toBeUndefined();
    expect(
      changelogItemTutorial({ text: "x", category: "inhalte" }),
    ).toBeUndefined();
    expect(
      changelogItemTutorial({
        text: "x",
        category: "inhalte",
        tutorial: "eigene-inhalte",
      }),
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

describe("Changelog-Kategorien", () => {
  it("gibt jedem gepflegten Stichpunkt eine bekannte Kategorie", () => {
    // Ohne diese Zusicherung fiele ein neuer Stichpunkt still in „Sonstiges"
    // — und wäre damit weder sinnvoll filterbar noch je Rolle ausblendbar.
    for (const entry of CHANGELOG) {
      for (const item of entry.items) {
        const category = changelogItemCategory(item);
        expect(
          isChangelogCategory(category),
          `${entry.version}: ${changelogItemText(item).slice(0, 40)}`,
        ).toBe(true);
        expect(category, `${entry.version}: ohne Kategorie`).not.toBe(
          "sonstiges",
        );
      }
    }
  });

  it("nimmt einen String-Stichpunkt als Sonstiges", () => {
    expect(changelogItemCategory("alter Stichpunkt")).toBe("sonstiges");
  });

  it("bietet nur Kategorien an, die auch vorkommen", () => {
    expect(changelogCategoriesPresent(TEST_ENTRIES)).toEqual([
      "inhalte",
      "charaktere",
    ]);
    expect(changelogCategoriesPresent([])).toEqual([]);
  });

  it("filtert Stichpunkte statt ganzer Versionen", () => {
    const filtered = filterChangelogEntries(TEST_ENTRIES, ["charaktere"]);
    // Version 2.0 hatte nur „inhalte" und fällt deshalb ganz weg.
    expect(filtered.map((e) => e.version)).toEqual(["2.1"]);
    expect(filtered[0].items.map(changelogItemText)).toEqual(["B"]);
  });

  it("versteht eine leere Auswahl als alles, nicht als nichts", () => {
    expect(filterChangelogEntries(TEST_ENTRIES, [])).toEqual(TEST_ENTRIES);
  });

  it("blendet die genannten Kategorien aus", () => {
    const visible = hideChangelogCategories(TEST_ENTRIES, ["inhalte"]);
    expect(visible.map((e) => e.version)).toEqual(["2.1"]);
    expect(visible[0].items.map(changelogItemText)).toEqual(["B"]);
    expect(hideChangelogCategories(TEST_ENTRIES, [])).toEqual(TEST_ENTRIES);
  });

  it("sortiert die Stichpunkte innerhalb einer Version nach Kategorie", () => {
    const [, entry] = sortChangelogItemsByCategory(TEST_ENTRIES, "asc");
    // Katalog-Reihenfolge: inhalte vor charaktere.
    expect(entry.items.map(changelogItemText)).toEqual(["C", "B"]);
    const [, reversed] = sortChangelogItemsByCategory(TEST_ENTRIES, "desc");
    expect(reversed.items.map(changelogItemText)).toEqual(["B", "C"]);
  });
});

describe("missingChangelogVersions", () => {
  // AGENTS.md verlangt einen Eintrag pro zusammengeführtem Pull Request.
  // Genau das prüft dieser Test: Wer die Minor-Version erhöht, ohne den
  // Changelog zu ergänzen, bekommt hier einen roten Lauf statt einer still
  // wachsenden Lücke.
  it("findet keine Lücke im echten Changelog", () => {
    expect(missingChangelogVersions()).toEqual([]);
  });

  it("meldet eine fehlende Zwischenversion", () => {
    const entries: ChangelogEntry[] = [
      { version: "3.0", title: "a", items: [] },
      { version: "3.2", title: "c", items: [] },
    ];
    expect(missingChangelogVersions(entries)).toEqual(["3.1"]);
  });

  it("zählt Minor-Versionen je Major, nicht durchgehend", () => {
    // Die Minor-Reihe beginnt mit jeder Major-Version wieder bei 0 (siehe
    // version.ts) — zwischen 3.2 und 4.0 fehlt also nichts.
    const entries: ChangelogEntry[] = [
      { version: "3.2", title: "a", items: [] },
      { version: "4.0", title: "b", items: [] },
    ];
    expect(missingChangelogVersions(entries)).toEqual([]);
  });

  it("hält die bekannten Alt-Lücken für abschließend", () => {
    // Wächst diese Liste, ist eine neue Lücke stillschweigend legitimiert
    // worden — genau das soll der Test verhindern.
    expect([...CHANGELOG_KNOWN_GAPS]).toEqual(["1.4", "1.5", "1.6", "1.7"]);
  });
});
