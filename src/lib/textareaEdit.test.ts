import { describe, it, expect, vi } from "vitest";
import { wrapSelection, applyLinePrefix, insertAtCursor } from "./textareaEdit";

function textarea(value: string, start = 0, end = start) {
  const el = document.createElement("textarea");
  el.value = value;
  document.body.appendChild(el);
  el.setSelectionRange(start, end);
  return el;
}

describe("wrapSelection", () => {
  it("umschließt die Auswahl und lässt sie markiert", () => {
    const el = textarea("Ein Wort", 4, 8);
    wrapSelection(el, "**", "**", "fett");
    expect(el.value).toBe("Ein **Wort**");
    expect(el.value.slice(el.selectionStart, el.selectionEnd)).toBe("Wort");
  });

  it("setzt ohne Auswahl den Platzhalter ein", () => {
    const el = textarea("");
    wrapSelection(el, "*", "*", "kursiv");
    expect(el.value).toBe("*kursiv*");
  });
});

describe("applyLinePrefix", () => {
  it("stellt jeder berührten Zeile ihr Präfix voran", () => {
    const el = textarea("eins\nzwei\ndrei", 0, 9);
    applyLinePrefix(el, (i) => `${i + 1}. `);
    expect(el.value).toBe("1. eins\n2. zwei\ndrei");
  });
});

describe("insertAtCursor", () => {
  it("fügt an der Cursor-Stelle ein", () => {
    const el = textarea("ab", 1);
    insertAtCursor(el, "X");
    expect(el.value).toBe("aXb");
  });

  it("gibt dem Eingefügten mit ownLine eine eigene Zeile", () => {
    const el = textarea("Davor.Danach.", 6);
    insertAtCursor(el, "X", { ownLine: true });
    expect(el.value).toBe("Davor.\nX\nDanach.");
  });

  it("verdoppelt vorhandene Zeilenumbrüche nicht", () => {
    // Cursor steht auf der leeren Zeile zwischen den beiden Absätzen: davor
    // steht bereits ein Umbruch, danach auch — es kommt keiner dazu.
    const el = textarea("Davor.\n\nDanach.", 7);
    insertAtCursor(el, "X", { ownLine: true });
    expect(el.value).toBe("Davor.\nX\nDanach.");
  });
});

// Ohne dieses Ereignis sähe die globale Entwurfs-Sicherung
// (InputDraftKeeper.tsx) nichts von dem, was die Werkzeugleiste einfügt — ein
// Reload würde genau diese Stellen wieder verschlucken.
describe("Meldung an die Entwurfs-Sicherung", () => {
  it.each([
    ["wrapSelection", (el: HTMLTextAreaElement) => wrapSelection(el, "**")],
    ["applyLinePrefix", (el: HTMLTextAreaElement) => applyLinePrefix(el, () => "- ")],
    ["insertAtCursor", (el: HTMLTextAreaElement) => insertAtCursor(el, "X")],
  ])("%s löst ein input-Ereignis aus, das bis zum Dokument steigt", (_name, run) => {
    const el = textarea("Text");
    const gesehen = vi.fn();
    document.addEventListener("input", gesehen);
    try {
      run(el);
    } finally {
      document.removeEventListener("input", gesehen);
    }
    expect(gesehen).toHaveBeenCalledTimes(1);
  });
});
