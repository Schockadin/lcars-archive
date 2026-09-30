import { describe, expect, it } from "vitest";
import {
  buildMissionSynopsisMarkdown,
  defaultSessionSynopsisDate,
  getPreviousSessionSynopsisBlocks,
  sessionSynopsisHeading,
} from "./sessionSynopsis";

describe("Session-Synopsis-Blöcke", () => {
  it("nimmt den spätesten Wert aus Missionsstart, Session und Vorgängersession", () => {
    expect(defaultSessionSynopsisDate("2234-12-13", [])).toBe("2234-12-13");
    expect(defaultSessionSynopsisDate("2234-12-13", [
      { ingameDate: "2234-12-20" },
    ])).toBe("2234-12-21");
    expect(defaultSessionSynopsisDate("2234-12-13", [
      { ingameDate: "2234-12-31" },
    ])).toBe("2235-01-01");
    expect(
      defaultSessionSynopsisDate(
        "2234-12-13",
        [{ ingameDate: "2234-12-14" }],
        [{ ingameDate: "2234-12-20" }],
      ),
    ).toBe("2234-12-21");
    expect(
      defaultSessionSynopsisDate(
        "2234-12-13",
        [{ ingameDate: "2234-12-25" }],
        [{ ingameDate: "2234-12-20" }],
      ),
    ).toBe("2234-12-26");
  });

  it("findet die höchste Sessionnummer vor der aktuellen Mission-Session", () => {
    const sessions = [
      {
        missionId: 1,
        missionSessionNumber: 1,
        synopsisBlocks: [{ ingameDate: "2234-12-10" }],
      },
      {
        missionId: 1,
        missionSessionNumber: 2,
        synopsisBlocks: [{ ingameDate: "2234-12-20" }],
      },
      {
        missionId: 1,
        missionSessionNumber: 3,
        synopsisBlocks: [{ ingameDate: "2234-12-30" }],
      },
      {
        missionId: 2,
        missionSessionNumber: 4,
        synopsisBlocks: [{ ingameDate: "2235-01-01" }],
      },
    ];

    expect(getPreviousSessionSynopsisBlocks(sessions, 1, 3)).toEqual([
      { ingameDate: "2234-12-20" },
    ]);
    expect(getPreviousSessionSynopsisBlocks(sessions, 1)).toEqual([
      { ingameDate: "2234-12-30" },
    ]);
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
