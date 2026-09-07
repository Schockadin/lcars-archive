import { describe, expect, it } from "vitest";
import { dateFromAttributes } from "./timeline";

// Datenbank-Einträge führen ihre Zusatzangaben als frei benannte
// Frontmatter-Paare — welches Label die Runde für ein Datum verwendet, steht
// nirgends fest. Deshalb eine Heuristik, und deshalb Tests dafür.
describe("dateFromAttributes", () => {
  const attrs = (list: { label: string; value: string }[]) => ({
    attributes: list,
  });

  it("findet ein Datum hinter einem passend benannten Label", () => {
    expect(
      dateFromAttributes(attrs([{ label: "Datum", value: "2401-03-14" }])),
    ).toBe("2401-03-14");
  });

  it("erkennt auch englische und zusammengesetzte Label", () => {
    for (const label of ["Date", "Ereignisdatum", "Zeitpunkt"]) {
      expect(
        dateFromAttributes(attrs([{ label, value: "2401-03-14" }])),
      ).toBe("2401-03-14");
    }
  });

  it("ignoriert Label, die nichts mit einem Datum zu tun haben", () => {
    expect(
      dateFromAttributes(attrs([{ label: "Sternsystem", value: "2401-03-14" }])),
    ).toBeNull();
  });

  it("ignoriert einen Wert, der kein ISO-Datum ist", () => {
    expect(
      dateFromAttributes(attrs([{ label: "Datum", value: "irgendwann 2401" }])),
    ).toBeNull();
  });

  it("nimmt das erste passende Paar", () => {
    expect(
      dateFromAttributes(
        attrs([
          { label: "Klasse", value: "Galaxy" },
          { label: "Datum", value: "2401-03-14" },
          { label: "Enddatum", value: "2402-01-01" },
        ]),
      ),
    ).toBe("2401-03-14");
  });

  it("kommt mit fehlenden oder kaputten Attributen zurecht", () => {
    expect(dateFromAttributes({})).toBeNull();
    expect(dateFromAttributes({ attributes: "keine Liste" })).toBeNull();
    expect(dateFromAttributes({ attributes: [null, 42] })).toBeNull();
  });
});
