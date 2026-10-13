import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  TALENT_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  isTalentCategory,
  talentCategoryLabel,
  validateTalentInput,
  talentOptionLabel,
  byTalentOrder,
  TALENT_NAME_MAX,
  formatTalentEntry,
  formatTalentSelection,
  parseTalentEntry,
  availableTalentSelections,
  checkTalentSelection,
  talentDisplayName,
  type Talent,
} from "@/lib/talentCatalog";

function talent(partial: Partial<Talent>): Talent {
  return {
    id: 1,
    name: "Testtalent",
    category: "general",
    requirement: null,
    description: "Beschreibung.",
    descriptionHtml: "<p>Beschreibung.</p>",
    isCustom: false,
    ...partial,
  };
}

describe("Talent-Kategorien", () => {
  it("hat für jede Kategorie ein Label", () => {
    for (const category of TALENT_CATEGORIES) {
      expect(TALENT_CATEGORY_LABELS[category].label).toBeTruthy();
      expect(TALENT_CATEGORY_LABELS[category].original).toBeTruthy();
    }
  });

  it("erkennt gültige und ungültige Schlüssel", () => {
    expect(isTalentCategory("medicine")).toBe(true);
    expect(isTalentCategory("holodeck")).toBe(false);
  });

  it("gibt unbekannte Schlüssel unverändert zurück statt zu werfen", () => {
    expect(talentCategoryLabel("holodeck")).toBe("holodeck");
    expect(talentCategoryLabel("conn")).toBe("Steuerung");
  });
});

describe("validateTalentInput", () => {
  const valid = {
    name: "  Bold Command  ",
    category: "command",
    requirement: "  Command 2+  ",
    description: "  Tut etwas.  ",
  };

  it("trimmt und übernimmt gültige Eingaben", () => {
    const result = validateTalentInput(valid);
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Bold Command",
        category: "command",
        requirement: "Command 2+",
        description: "Tut etwas.",
      },
    });
  });

  it("macht eine leere Voraussetzung zu null", () => {
    const result = validateTalentInput({ ...valid, requirement: "   " });
    expect(result.ok && result.value.requirement).toBeNull();
  });

  it("lehnt leeren Namen, leere Beschreibung und unbekannte Kategorie ab", () => {
    expect(validateTalentInput({ ...valid, name: "  " }).ok).toBe(false);
    expect(validateTalentInput({ ...valid, description: "" }).ok).toBe(false);
    expect(validateTalentInput({ ...valid, category: "holodeck" }).ok).toBe(false);
  });

  it("lehnt zu lange Namen ab", () => {
    const result = validateTalentInput({ ...valid, name: "x".repeat(TALENT_NAME_MAX + 1) });
    expect(result.ok).toBe(false);
  });

  // Klammern im Katalognamen wären auf dem Bogen von einer Umbenennung
  // („Neuer Name (Originalname)") nicht mehr zu unterscheiden — das Talent
  // wäre danach nicht mehr auswählbar. Siehe parseTalentEntry.
  it("lehnt Klammern im Namen ab", () => {
    expect(validateTalentInput({ ...valid, name: "Bold (Command)" }).ok).toBe(false);
    expect(validateTalentInput({ ...valid, name: "Bold )" }).ok).toBe(false);
    expect(validateTalentInput({ ...valid, name: "Bold" }).ok).toBe(true);
  });
});

describe("Anzeige und Sortierung", () => {
  it("hängt die Voraussetzung an den Anzeigenamen, wenn es eine gibt", () => {
    expect(talentOptionLabel(talent({ name: "Bold", requirement: "Conn 2+" }))).toBe(
      "Bold (Conn 2+)",
    );
    expect(talentOptionLabel(talent({ name: "Bold" }))).toBe("Bold");
  });

  it("sortiert nach Kategorie-Reihenfolge, dann alphabetisch", () => {
    const sorted = [
      talent({ id: 1, name: "Zeta", category: "medicine" }),
      talent({ id: 2, name: "Beta", category: "general" }),
      talent({ id: 3, name: "Alpha", category: "medicine" }),
    ].sort(byTalentOrder);
    expect(sorted.map((t) => t.name)).toEqual(["Beta", "Alpha", "Zeta"]);
  });
});

// Die Startdaten liegen als JSON im Repo und werden von scripts/seed-talents.ts
// eingespielt — bricht dort etwas, fällt es erst beim Seed gegen die echte DB
// auf. Deshalb hier geprüft.
describe("scripts/seed/talents.json", () => {
  const seed = JSON.parse(readFileSync("scripts/seed/talents.json", "utf-8")) as {
    name: string;
    category: string;
    requirement: string | null;
    description: string;
  }[];

  it("enthält den vollständigen Katalog", () => {
    expect(seed.length).toBeGreaterThanOrEqual(150);
  });

  it("nutzt nur bekannte Kategorien und hat überall Name + Beschreibung", () => {
    for (const entry of seed) {
      expect(isTalentCategory(entry.category), `${entry.name}: ${entry.category}`).toBe(true);
      expect(entry.name.trim(), JSON.stringify(entry)).toBeTruthy();
      expect(entry.description.trim(), entry.name).toBeTruthy();
    }
  });

  it("hat eindeutige Namen (talents.name ist UNIQUE)", () => {
    const names = seed.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("enthält keine übrig gebliebene Markdown-Auszeichnung", () => {
    for (const entry of seed) {
      expect(entry.name, entry.name).not.toContain("*");
      expect(entry.requirement ?? "", entry.name).not.toContain("*");
    }
  });

  it("führt die variablen Talente ohne X und mit der neuen Voraussetzung", () => {
    const byName = new Map(seed.map((entry) => [entry.name, entry]));
    expect(byName.has("Bold")).toBe(true);
    expect(byName.has("Cautious")).toBe(true);
    expect(byName.has("Collaboration")).toBe(true);
    expect(byName.has("Bold X")).toBe(false);
    expect(byName.has("Cautious X")).toBe(false);
    expect(byName.has("Collaboration X")).toBe(false);
    expect(byName.get("Dedicated Focus X")?.requirement).toBe("Department 4+");
    expect(byName.get("Augmented Ability")?.requirement).toBe("Augment trait");
  });
});

// Eigene Namen: gespeichert wird „Neuer Name (Originalname)" — dieselbe Form,
// in der es auch angezeigt wird (siehe TalentPicker).
describe("Eigene Talent-Namen", () => {
  it("setzt Name und Original zusammen", () => {
    expect(formatTalentEntry("Bold Command", "Draufgänger")).toBe(
      "Draufgänger (Bold Command)",
    );
  });

  it("lässt den Originalnamen stehen, wenn nicht umbenannt wurde", () => {
    expect(formatTalentEntry("Bold Command", "")).toBe("Bold Command");
    expect(formatTalentEntry("Bold Command", "   ")).toBe("Bold Command");
    expect(formatTalentEntry("Bold Command", "Bold Command")).toBe("Bold Command");
  });

  it("liest den Originalnamen wieder heraus", () => {
    expect(parseTalentEntry("Draufgänger (Bold Command)")).toEqual({
      name: "Draufgänger (Bold Command)",
      original: "Bold Command",
    });
  });

  it("behandelt einen Eintrag ohne Klammer als seinen eigenen Originalnamen", () => {
    expect(parseTalentEntry("Bold Command")).toEqual({
      name: "Bold Command",
      original: "Bold Command",
    });
  });

  it("verträgt kaputte Klammern, ohne den Eintrag zu verstümmeln", () => {
    expect(parseTalentEntry("Nur ein ( Text")).toEqual({
      name: "Nur ein ( Text",
      original: "Nur ein ( Text",
    });
    expect(parseTalentEntry("()")).toEqual({ name: "()", original: "()" });
  });

  it("speichert und liest eine ausgewählte Variante als Talent (Auswahl)", () => {
    const entry = formatTalentSelection("Bold", "Command");
    expect(entry).toBe("Bold (Command)");
    expect(parseTalentEntry(entry)).toEqual({
      name: "Bold (Command)",
      original: "Bold",
      selection: "Command",
    });
  });

  it("erkennt ausgewählte Varianten auch nach einer Umbenennung", () => {
    expect(parseTalentEntry("Kühn (Bold (Command))")).toEqual({
      name: "Kühn (Bold (Command))",
      original: "Bold",
      selection: "Command",
    });
  });

  it("zeigt alte Talentnamen ohne das entfernte X an", () => {
    expect(parseTalentEntry("Bold X")).toEqual({ name: "Bold", original: "Bold" });
    expect(talentDisplayName("Collaboration X")).toBe("Collaboration");
    expect(talentDisplayName("Dedicated Focus X")).toBe("Dedicated Focus X");
  });

  it("schließt bereits für ein anderes Abteilungs-Talent gewählte Abteilungen aus", () => {
    expect(availableTalentSelections("Collaboration", ["Bold (Command)"])).not.toContain(
      "Command",
    );
    expect(checkTalentSelection("Cautious (Command)", ["Bold (Command)"])).toMatch(
      /bereits vergeben/,
    );
    expect(checkTalentSelection("Cautious (Conn)", ["Bold (Command)"])).toBeNull();
  });

  it("verlangt ein Attribut oder einen eingetragenen Schwerpunkt als Auswahl", () => {
    expect(checkTalentSelection("Augmented Ability", [], [])).toMatch(/benötigt eine Auswahl/);
    expect(checkTalentSelection("Augmented Ability (Control)", [], [])).toBeNull();
    expect(
      checkTalentSelection("Augmented Ability (Control)", ["Augmented Ability (Control)"]),
    ).toMatch(/bereits vergeben/);
    expect(checkTalentSelection("Dedicated Focus X (Tactical Analysis)", [], [])).toMatch(
      /mindestens ein Schwerpunkt/,
    );
    expect(
      checkTalentSelection("Dedicated Focus X (Tactical Analysis)", [], ["Tactical Analysis"]),
    ).toBeNull();
  });
});
