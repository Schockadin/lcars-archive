import { describe, expect, it } from "vitest";
import { groupMissionTimelineEntries } from "./missionTimeline";
import type { TimelineEvent } from "./timelineTypes";
import type { MissionLogListItem } from "@/types/missions";

function event(
  id: string,
  overrides: Partial<TimelineEvent> = {},
): TimelineEvent {
  return {
    id,
    date: "2401-03-05",
    title: id,
    detail: null,
    category: "discovery",
    origin: "marker",
    sourceType: "mission",
    sourceTitle: "Mission",
    href: "/chronologie/mission/mission",
    people: [],
    ...overrides,
  };
}

function log(date: string | null): MissionLogListItem {
  return {
    id: 1,
    slug: "log-1",
    title: "Logbuch",
    session_nr: 1,
    log_date: date,
    author_name: "T'Lara",
    author_slug: "t-lara",
    ownerUserId: null,
    isDraft: false,
  };
}

describe("groupMissionTimelineEntries", () => {
  it("ordnet Logs und Gespräche nur bei gleichem Ingame-Datum zu", () => {
    const entries = [
      event("Treffer"),
      event("Anderer Tag", { date: "2401-03-06" }),
    ];
    const dialogues = [
      event("Gespräch", {
        sourceType: "archive_entry",
        category: "dialogue",
        origin: "metadata",
      }),
      event("Gespräch anderer Tag", {
        date: "2401-03-06",
        sourceType: "archive_entry",
        category: "dialogue",
        origin: "metadata",
      }),
    ];

    const groups = groupMissionTimelineEntries(
      entries,
      [log("2401-03-05"), { ...log("2401-03-06"), id: 2 }],
      dialogues,
    );

    expect(groups.map((group) => group.event.title)).toEqual([
      "Anderer Tag",
      "Treffer",
    ]);
    expect(groups[1].logs.map((item) => item.title)).toEqual(["Logbuch"]);
    expect(groups[1].dialogues.map((item) => item.title)).toEqual(["Gespräch"]);
    expect(groups[0].logs).toEqual([]);
    expect(groups[0].dialogues).toEqual([
      expect.objectContaining({ title: "Gespräch anderer Tag" }),
    ]);
  });

  it("zeigt nur datierte Marken und abgeleitete Ereignisse der Mission", () => {
    const groups = groupMissionTimelineEntries(
      [
        event("Marke"),
        event("Ableitung", { id: "inferred", origin: "inferred" }),
        event("Startdatum", { id: "start", origin: "metadata" }),
        event("Logmarker", { id: "log", sourceType: "mission_log" }),
        event("Undatiert", { id: "undated", date: null }),
      ],
      [log(null)],
      [],
    );

    expect(groups.map((group) => group.event.title)).toEqual([
      "Ableitung",
      "Marke",
    ]);
    expect(groups.every((group) => group.logs.length === 0)).toBe(true);
  });
});
