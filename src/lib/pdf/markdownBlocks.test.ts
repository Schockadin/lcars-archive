import { describe, it, expect } from "vitest";
import { toPdfBlocks, toSpans } from "./markdownBlocks";

// Nur Art und reiner Text eines Blocks — die Auszeichnung prüfen die
// Span-Tests weiter unten, sonst stünde in jeder Erwartung der ganze Aufbau.
function shape(markdown: string) {
  return toPdfBlocks(markdown).map(({ kind, text }) => ({ kind, text }));
}

describe("toPdfBlocks", () => {
  it("trennt Absätze an Leerzeilen und fasst Zeilen darin zusammen", () => {
    expect(shape("Erste Zeile\nzweite Zeile\n\nNeuer Absatz")).toEqual([
      { kind: "paragraph", text: "Erste Zeile zweite Zeile" },
      { kind: "paragraph", text: "Neuer Absatz" },
    ]);
  });

  it("erkennt Überschriften, Aufzählungen und Zitate", () => {
    expect(
      shape("## Laufbahn\n\n- Akademie\n1. Erster Posten\n\n> Zitat"),
    ).toEqual([
      { kind: "heading", text: "Laufbahn" },
      { kind: "listItem", text: "Akademie" },
      { kind: "listItem", text: "Erster Posten" },
      { kind: "quote", text: "Zitat" },
    ]);
  });

  it("führt Verweis-Syntax auf ihren sichtbaren Text zurück", () => {
    expect(shape("Siehe [die Akte](/archive/akte).")[0].text).toBe(
      "Siehe die Akte.",
    );
    expect(shape("![Portrait](/bild.png)")[0].text).toBe("Portrait");
    expect(shape("[[ziel|Anzeigename]] und [[nur-ziel]]")[0].text).toBe(
      "Anzeigename und nur-ziel",
    );
    expect(shape("~~gestrichen~~")[0].text).toBe("gestrichen");
  });

  it("lässt Codeblöcke Zeile für Zeile stehen, ohne die Zäune", () => {
    expect(shape("```\nzeile eins\nzeile zwei\n```")).toEqual([
      { kind: "paragraph", text: "zeile eins" },
      { kind: "paragraph", text: "zeile zwei" },
    ]);
  });

  it("wirft Trennlinien und leere Eingaben weg", () => {
    expect(toPdfBlocks("---")).toEqual([]);
    expect(toPdfBlocks("")).toEqual([]);
    expect(toPdfBlocks("   \n\n  ")).toEqual([]);
  });

  // Kommentare stehen auch im gerenderten Text nicht — im PDF haben sie
  // deshalb erst recht nichts verloren. Wichtigster Fall: die
  // <!-- timeline: … -->-Marken, die in fast jedem Bericht stecken.
  it("druckt HTML-Kommentare nicht mit", () => {
    expect(
      shape("Vorher\n\n<!-- timeline: 2401-03-14 | Erstkontakt -->\n\nNachher"),
    ).toEqual([
      { kind: "paragraph", text: "Vorher" },
      { kind: "paragraph", text: "Nachher" },
    ]);
  });

  it("entfernt auch mehrzeilige Kommentare mitten im Absatz", () => {
    expect(shape("Text <!--\nmehrzeilig\n--> geht weiter")[0].text).toBe(
      "Text  geht weiter",
    );
  });

  it("reicht die Auszeichnung als Stücke durch", () => {
    const [block] = toPdfBlocks("Ganz **wichtig** hier");
    expect(block.spans).toEqual([
      { text: "Ganz " },
      { text: "wichtig", bold: true },
      { text: " hier" },
    ]);
  });
});

describe("toSpans", () => {
  it("erkennt fett, kursiv und beides zusammen", () => {
    expect(toSpans("**fett**")).toEqual([{ text: "fett", bold: true }]);
    expect(toSpans("__fett__")).toEqual([{ text: "fett", bold: true }]);
    expect(toSpans("*kursiv*")).toEqual([{ text: "kursiv", italic: true }]);
    expect(toSpans("_kursiv_")).toEqual([{ text: "kursiv", italic: true }]);
    expect(toSpans("***beides***")).toEqual([
      { text: "beides", bold: true, italic: true },
    ]);
  });

  it("hält Code als eigenes Stück", () => {
    expect(toSpans("vor `code` nach")).toEqual([
      { text: "vor " },
      { text: "code", code: true },
      { text: " nach" },
    ]);
  });

  it("lässt Sternchen ohne Partner stehen", () => {
    // Ein einzelner Stern im Fließtext ist ein Stern, kein halber
    // Kursivbereich — sonst verschluckte das PDF Zeichen.
    expect(toSpans("2 * 3 = 6")).toEqual([{ text: "2 * 3 = 6" }]);
  });

  it("wertet Auszeichnung innerhalb eines Verweistexts aus", () => {
    expect(toSpans("[**Akte**](/archive/x)")).toEqual([
      { text: "Akte", bold: true },
    ]);
  });

  it("kommt mit mehreren Bereichen in einer Zeile zurecht", () => {
    expect(toSpans("**a** und *b*")).toEqual([
      { text: "a", bold: true },
      { text: " und " },
      { text: "b", italic: true },
    ]);
  });
});
