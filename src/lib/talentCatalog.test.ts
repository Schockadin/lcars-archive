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
  type Talent,
} from "@/lib/talentCatalog";

function talent(partial: Partial<Talent>): Talent {
  return {
    id: 1,
    name: "Testtalent",
    category: "general",
    requirement: null,
    description: "Beschreibung.",
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
});
