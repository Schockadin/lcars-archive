import { describe, expect, it } from "vitest";
import {
  addOneDayToSynopsisDate,
  buildMissionSynopsisMarkdown,
  defaultSessionSynopsisDate,
  sessionSynopsisHeading,
} from "./sessionSynopsis";

describe("Session-Synopsis-Blöcke", () => {
  it("nimmt für den ersten Block das Missionsdatum und danach den Folgetag des letzten Blocks", () => {
    expect(defaultSessionSynopsisDate("2234-12-13", [])).toBe("2234-12-13");
    expect(defaultSessionSynopsisDate("2234-12-13", [
      { ingameDate: "2234-12-20", endDate: null },
    ])).toBe("2234-12-21");
    expect(defaultSessionSynopsisDate("2234-12-13", [
      { ingameDate: "2234-12-20", endDate: "2234-12-22" },
    ])).toBe("2234-12-23");
  });

  it("setzt ein Enddatum auf den Folgetag und behandelt Monats- und Jahreswechsel", () => {
    expect(addOneDayToSynopsisDate("2234-12-20")).toBe("2234-12-21");
    expect(addOneDayToSynopsisDate("2234-12-31")).toBe("2235-01-01");
    expect(addOneDayToSynopsisDate("")).toBe("");
  });

  it("formatiert einzelne Daten und Datumsbereiche", () => {
    expect(
      sessionSynopsisHeading(
        "2401-08-03",
        null,
      ),
    ).toBe("## Synopsis 2401-08-03");
    expect(sessionSynopsisHeading("2401-08-03", "2401-08-07")).toBe(
      "## Synopsis 2401-08-03–2401-08-07",
    );
  });

  it("baut die Missionszusammenfassung aus mehreren Session-Blöcken", () => {
    expect(
      buildMissionSynopsisMarkdown([
        {
          ingameDate: "2401-08-03",
          endDate: null,
          body: " Die Crew erreichte den Außenposten. ",
        },
        {
          ingameDate: "2401-08-04",
          endDate: "2401-08-06",
          body: "Verhandlungen beginnen.",
        },
      ]),
    ).toBe(
      "## Synopsis 2401-08-03\n\nDie Crew erreichte den Außenposten.\n\n## Synopsis 2401-08-04–2401-08-06\n\nVerhandlungen beginnen.",
    );
  });

  it("überspringt leere optionale Zusammenfassungen", () => {
    expect(
      buildMissionSynopsisMarkdown([
        { ingameDate: "2401-08-03", endDate: null, body: "  " },
      ]),
    ).toBe("");
  });
});
