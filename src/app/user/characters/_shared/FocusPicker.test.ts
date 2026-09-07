import { describe, it, expect } from "vitest";
import { mergeByName } from "./FocusPicker";
import type { Focus } from "@/lib/focusCatalog";

function focus(partial: Partial<Focus>): Focus {
  return {
    id: 1,
    name: "Astrophysics",
    discipline: "science",
    description: null,
    descriptionHtml: null,
    isCustom: false,
    ...partial,
  };
}

describe("mergeByName", () => {
  // Sechs Namen führt der Regeltext in ZWEI Disziplinen; auf dem Bogen steht
  // nur der Name, in der Auswahl gehört das in EINE Zeile.
  it("fasst denselben Namen aus zwei Disziplinen zusammen", () => {
    const entries = mergeByName([
      focus({ id: 1, discipline: "science" }),
      focus({ id: 2, discipline: "conn" }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].disciplines).toEqual(["Wissenschaft", "Steuerung"]);
  });

  it("führt gleiche Erläuterungen nur einmal", () => {
    const entries = mergeByName([
      focus({ id: 1, discipline: "science", descriptionHtml: "<p>Gleich.</p>" }),
      focus({ id: 2, discipline: "conn", descriptionHtml: "<p>Gleich.</p>" }),
    ]);
    expect(entries[0].descriptions).toEqual(["<p>Gleich.</p>"]);
  });

  it("behält unterschiedliche Erläuterungen beide", () => {
    const entries = mergeByName([
      focus({ id: 1, discipline: "science", descriptionHtml: "<p>Eins.</p>" }),
      focus({ id: 2, discipline: "conn", descriptionHtml: "<p>Zwei.</p>" }),
    ]);
    expect(entries[0].descriptions).toEqual(["<p>Eins.</p>", "<p>Zwei.</p>"]);
  });

  it("sortiert alphabetisch und lässt Einträge ohne Erläuterung leer", () => {
    const entries = mergeByName([
      focus({ id: 1, name: "Zero-G Combat", discipline: "conn" }),
      focus({ id: 2, name: "Anthropology", discipline: "science" }),
    ]);
    expect(entries.map((e) => e.name)).toEqual(["Anthropology", "Zero-G Combat"]);
    expect(entries[0].descriptions).toEqual([]);
  });
});
