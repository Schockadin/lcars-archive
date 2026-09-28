import { describe, expect, it } from "vitest";
import { buildMissionSynopsisMarkdown, sessionSynopsisHeading } from "./sessionSynopsis";

describe("Session-Synopsis-Blöcke", () => {
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
