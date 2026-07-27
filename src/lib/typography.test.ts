import { describe, it, expect } from "vitest";
import {
  applyGermanTypography,
  opensQuote,
  GERMAN_QUOTE_OPEN as O,
  GERMAN_QUOTE_CLOSE as C,
} from "./typography";

describe("opensQuote (Kontext-Entscheidung)", () => {
  it("öffnet am Zeilen-/Textanfang und nach Leerraum/Klammer/Strich", () => {
    expect(opensQuote(undefined)).toBe(true);
    expect(opensQuote(" ")).toBe(true);
    expect(opensQuote("(")).toBe(true);
    expect(opensQuote("—")).toBe(true);
    expect(opensQuote("\n")).toBe(true);
  });
  it("schließt nach Wort-Zeichen und Satzzeichen", () => {
    expect(opensQuote("t")).toBe(false);
    expect(opensQuote(".")).toBe(false);
    expect(opensQuote("!")).toBe(false);
    expect(opensQuote("1")).toBe(false);
  });
});

describe("applyGermanTypography", () => {
  it("setzt ein einfaches Zitat korrekt (unten auf, oben zu)", () => {
    expect(applyGermanTypography('Er sagte "Hallo" laut.')).toBe(
      `Er sagte ${O}Hallo${C} laut.`,
    );
  });

  it("erzeugt bei wörtlicher Rede über MEHRERE Absätze kein unten stehendes Schluss-Zeichen", () => {
    const input = '"Erster Absatz der Rede.\n\nUnd der zweite Absatz endet hier."';
    const out = applyGermanTypography(input);
    // Öffnendes „ ganz am Anfang, schließendes " ganz am Ende (nicht unten!).
    expect(out.startsWith(O)).toBe(true);
    expect(out.endsWith(C)).toBe(true);
    expect(out).not.toContain(`hier.${O}`); // Regression: früher unten
  });

  it("lässt sich von einem unpaarigen \" nicht aus dem Takt bringen", () => {
    // Zoll-Angabe (unpaarig) darf das folgende Zitat nicht verdrehen.
    const out = applyGermanTypography('Das 5" Rohr und "danach" ein Zitat.');
    expect(out).toBe(`Das 5${C} Rohr und ${O}danach${C} ein Zitat.`);
  });

  it("tastet Code (Fence + Inline) nicht an", () => {
    expect(applyGermanTypography('`const s = "x"`')).toBe('`const s = "x"`');
    expect(applyGermanTypography('```\nsay "hi"\n```')).toBe('```\nsay "hi"\n```');
  });

  it("ist idempotent (bereits typografische Zeichen bleiben)", () => {
    const once = applyGermanTypography('Sie rief "Achtung!" laut.');
    expect(applyGermanTypography(once)).toBe(once);
  });

  it("gibt unveränderten Text ohne gerade Anführungszeichen zurück", () => {
    expect(applyGermanTypography("Nichts zu tun hier.")).toBe(
      "Nichts zu tun hier.",
    );
  });
});
