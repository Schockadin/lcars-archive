import { describe, expect, it } from "vitest";
import {
  TIMELINE_CSV_HEADER,
  TIMELINE_CSV_TEMPLATE,
  TimelineCsvError,
  parseTimelineCsv,
} from "./timelineCsvImport";

describe("parseTimelineCsv", () => {
  it("liest das vereinbarte Format und kommagetrennte Figuren", () => {
    expect(
      parseTimelineCsv(
        "Datum;Titel;Teaser;Text;Charaktere\n2401-03-05;Erstkontakt;Kurz;Lang;Tuvok, Kira",
      ),
    ).toEqual([
      {
        line: 2,
        date: "2401-03-05",
        title: "Erstkontakt",
        teaser: "Kurz",
        detail: "Lang",
        characterNames: ["Tuvok", "Kira"],
      },
    ]);
  });

  it("erlaubt Semikolons, Zeilenumbrüche und Anführungszeichen in Quotes", () => {
    const [row] = parseTimelineCsv(
      'Datum;Titel;Teaser;Text;Charaktere\n2401-03-05;"Titel; zwei";Kurz;"Zeile 1\nZeile ""2""";',
    );
    expect(row.title).toBe("Titel; zwei");
    expect(row.detail).toBe('Zeile 1\nZeile "2"');
  });

  it("liefert eine leere Vorlage mit korrekter Kopfzeile und Kommentar", () => {
    expect(TIMELINE_CSV_TEMPLATE.split(/\r?\n/)[0]).toBe(TIMELINE_CSV_HEADER);
    expect(parseTimelineCsv(TIMELINE_CSV_TEMPLATE)).toEqual([]);
  });

  it("ignoriert Kommentarzeilen und behält echte Zeilennummern", () => {
    expect(
      parseTimelineCsv(
        `${TIMELINE_CSV_HEADER}\n# Kommentar: Beispiel\n2401-03-05;Erstkontakt;Kurz;Lang;Tuvok`,
      ),
    ).toEqual([
      {
        line: 3,
        date: "2401-03-05",
        title: "Erstkontakt",
        teaser: "Kurz",
        detail: "Lang",
        characterNames: ["Tuvok"],
      },
    ]);
  });

  it("weist eine falsche Kopfzeile und unvollständige Zeilen ab", () => {
    expect(() => parseTimelineCsv("Datum;Titel\n2401;Test")).toThrow(
      TimelineCsvError,
    );
    expect(() =>
      parseTimelineCsv("Datum;Titel;Teaser;Text;Charaktere\n2401;Test"),
    ).toThrow(/fünf/);
  });
});
