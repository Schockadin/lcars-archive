import { describe, it, expect } from "vitest";
import {
  FOCUS_DISCIPLINES,
  byFocusOrder,
  disciplinesOf,
  focusKey,
  isFocusDiscipline,
  focusDisciplineLabel,
  validateFocusInput,
  type Focus,
} from "./focusCatalog";

function focus(overrides: Partial<Focus> = {}): Focus {
  return {
    id: 1,
    name: "Astrophysics",
    discipline: "science",
    description: null,
    descriptionHtml: null,
    isCustom: false,
    ...overrides,
  };
}

describe("isFocusDiscipline", () => {
  it("akzeptiert die sechs Disziplinen", () => {
    for (const d of FOCUS_DISCIPLINES) expect(isFocusDiscipline(d)).toBe(true);
  });

  it("weist alles andere ab", () => {
    expect(isFocusDiscipline("general")).toBe(false);
    expect(isFocusDiscipline("")).toBe(false);
  });
});

describe("focusDisciplineLabel", () => {
  it("übersetzt bekannte Disziplinen", () => {
    expect(focusDisciplineLabel("conn")).toBe("Steuerung");
  });

  it("gibt Unbekanntes unverändert zurück", () => {
    expect(focusDisciplineLabel("holodeck")).toBe("holodeck");
  });
});

describe("validateFocusInput", () => {
  const ok = { name: "Warp Theory", discipline: "science", description: "" };

  it("nimmt einen gültigen Eintrag an und trimmt den Namen", () => {
    const result = validateFocusInput({ ...ok, name: "  Warp Theory  " });
    expect(result).toEqual({
      ok: true,
      value: { name: "Warp Theory", discipline: "science", description: null },
    });
  });

  it("verlangt einen Namen", () => {
    expect(validateFocusInput({ ...ok, name: "   " })).toEqual({
      ok: false,
      error: "Bitte einen Namen angeben.",
    });
  });

  it("weist eine unbekannte Disziplin ab", () => {
    expect(validateFocusInput({ ...ok, discipline: "general" })).toEqual({
      ok: false,
      error: "Unbekannte Disziplin.",
    });
  });

  it("begrenzt die Namenslänge", () => {
    const result = validateFocusInput({ ...ok, name: "x".repeat(121) });
    expect(result.ok).toBe(false);
  });

  // Anders als beim Talent ist die Beschreibung optional — der Regeltext führt
  // Schwerpunkte nur als Liste.
  it("erlaubt einen Eintrag ohne Beschreibung", () => {
    const result = validateFocusInput(ok);
    expect(result.ok && result.value.description).toBeNull();
  });

  it("übernimmt eine vorhandene Beschreibung", () => {
    const result = validateFocusInput({ ...ok, description: " Warpfeldtheorie " });
    expect(result.ok && result.value.description).toBe("Warpfeldtheorie");
  });
});

describe("byFocusOrder", () => {
  it("sortiert nach Disziplin in Regeltext-Reihenfolge, dann alphabetisch", () => {
    const list = [
      focus({ id: 1, name: "Zero-G Combat", discipline: "conn" }),
      focus({ id: 2, name: "Physics", discipline: "science" }),
      focus({ id: 3, name: "Astronavigation", discipline: "conn" }),
      focus({ id: 4, name: "Diplomacy", discipline: "command" }),
    ];
    expect([...list].sort(byFocusOrder).map((f) => f.name)).toEqual([
      "Diplomacy",
      "Astronavigation",
      "Zero-G Combat",
      "Physics",
    ]);
  });
});

describe("focusKey", () => {
  it("vergleicht ohne Groß-/Kleinschreibung und Randleerzeichen", () => {
    expect(focusKey("  Warp Theory ")).toBe(focusKey("warp theory"));
  });
});

describe("disciplinesOf", () => {
  // Sechs Namen führt der Regeltext in ZWEI Disziplinen; auf dem Bogen steht
  // nur der Name, für die Auswahlliste gehören beide dazu.
  it("liefert alle Disziplinen eines Namens in Regeltext-Reihenfolge", () => {
    const list = [
      focus({ id: 1, name: "Astrophysics", discipline: "science" }),
      focus({ id: 2, name: "Astrophysics", discipline: "conn" }),
      focus({ id: 3, name: "Physics", discipline: "science" }),
    ];
    expect(disciplinesOf(list, "astrophysics")).toEqual(["conn", "science"]);
    expect(disciplinesOf(list, "Physics")).toEqual(["science"]);
    expect(disciplinesOf(list, "Nichts")).toEqual([]);
  });
});
