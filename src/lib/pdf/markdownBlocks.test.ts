import { describe, it, expect } from "vitest";
import { toPdfBlocks } from "./markdownBlocks";

describe("toPdfBlocks", () => {
  it("trennt Absätze an Leerzeilen und fasst Zeilen darin zusammen", () => {
    expect(toPdfBlocks("Erste Zeile\nzweite Zeile\n\nNeuer Absatz")).toEqual([
      { kind: "paragraph", text: "Erste Zeile zweite Zeile" },
      { kind: "paragraph", text: "Neuer Absatz" },
    ]);
  });

  it("erkennt Überschriften, Aufzählungen und Zitate", () => {
    expect(
      toPdfBlocks("## Laufbahn\n\n- Akademie\n1. Erster Posten\n\n> Zitat"),
    ).toEqual([
      { kind: "heading", text: "Laufbahn" },
      { kind: "listItem", text: "Akademie" },
      { kind: "listItem", text: "Erster Posten" },
      { kind: "quote", text: "Zitat" },
    ]);
  });

  // Auszeichnungszeichen im Druck wären nur Rauschen — der Text zählt.
  it("führt Inline-Auszeichnungen auf ihren Text zurück", () => {
    expect(toPdfBlocks("**fett** und *kursiv* und `code`")[0].text).toBe(
      "fett und kursiv und code",
    );
    expect(toPdfBlocks("Siehe [die Akte](/archive/akte).")[0].text).toBe(
      "Siehe die Akte.",
    );
    expect(toPdfBlocks("![Portrait](/bild.png)")[0].text).toBe("Portrait");
    expect(toPdfBlocks("[[ziel|Anzeigename]] und [[nur-ziel]]")[0].text).toBe(
      "Anzeigename und nur-ziel",
    );
    expect(toPdfBlocks("~~gestrichen~~")[0].text).toBe("gestrichen");
  });

  it("lässt Codeblöcke Zeile für Zeile stehen, ohne die Zäune", () => {
    expect(toPdfBlocks("```\nzeile eins\nzeile zwei\n```")).toEqual([
      { kind: "paragraph", text: "zeile eins" },
      { kind: "paragraph", text: "zeile zwei" },
    ]);
  });

  it("wirft Trennlinien und leere Eingaben weg", () => {
    expect(toPdfBlocks("---")).toEqual([]);
    expect(toPdfBlocks("")).toEqual([]);
    expect(toPdfBlocks("   \n\n  ")).toEqual([]);
  });
});
