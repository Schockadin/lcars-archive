import { describe, expect, it } from "vitest";
import {
  buildMissionSynopsisMarkdown,
  defaultSessionSynopsisDate,
  sessionSynopsisHeading,
} from "./sessionSynopsis";

describe("Session-Synopsis-Blöcke", () => {
  it("nimmt für den ersten Block das Missionsdatum und danach den Folgetag des letzten Blocks", () => {
    expect(defaultSessionSynopsisDate("2234-12-13", [])).toBe("2234-12-13");
    expect(defaultSessionSynopsisDate("2234-12-13", [
      { ingameDate: "2234-12-20" },
    ])).toBe("2234-12-21");
    expect(defaultSessionSynopsisDate("2234-12-13", [
      { ingameDate: "2234-12-31" },
    ])).toBe("2235-01-01");
  });

  it("formatiert das Ingame-Datum der Synopsis", () => {
    expect(sessionSynopsisHeading("2401-08-03")).toBe("## 2401-08-03");
  });

  it("baut die Missionszusammenfassung aus mehreren Session-Blöcken", () => {
    expect(
      buildMissionSynopsisMarkdown([
        {
          ingameDate: "2401-08-03",
          body: " Die Crew erreichte den Außenposten. ",
        },
        {
          ingameDate: "2401-08-04",
          body: "Verhandlungen beginnen.",
        },
      ]),
    ).toBe(
      "## 2401-08-03\n\nDie Crew erreichte den Außenposten.\n\n## 2401-08-04\n\nVerhandlungen beginnen.",
    );
  });

  it("überspringt leere optionale Zusammenfassungen", () => {
    expect(
      buildMissionSynopsisMarkdown([
        { ingameDate: "2401-08-03", body: "  " },
      ]),
    ).toBe("");
  });
});
