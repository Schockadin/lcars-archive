import { sortEvents, type TimelineEvent } from "@/lib/timelineTypes";
import type { MissionLogListItem } from "@/types/missions";

export interface MissionTimelineGroup {
  event: TimelineEvent;
  logs: MissionLogListItem[];
  dialogues: TimelineEvent[];
}

// Die Missionstext-Ereignisse bilden die oberste Ebene. Zugehörige Logs und
// abgeschlossene Gespräche werden ausschließlich über dasselbe Ingame-Datum
// gruppiert — nicht über Erstellungszeit oder Namen.
export function groupMissionTimelineEntries(
  events: TimelineEvent[],
  logs: MissionLogListItem[],
  dialogues: TimelineEvent[],
): MissionTimelineGroup[] {
  const missionEntries = sortEvents(
    events.filter(
      (event) =>
        event.sourceType === "mission" &&
        (event.origin === "marker" || event.origin === "inferred") &&
        event.date !== null,
    ),
    "desc",
  );

  return missionEntries.map((event) => ({
    event,
    logs: logs.filter((log) => log.log_date === event.date),
    dialogues: dialogues.filter(
      (dialogue) =>
        dialogue.sourceType === "archive_entry" &&
        dialogue.category === "dialogue" &&
        dialogue.origin === "metadata" &&
        dialogue.date === event.date,
    ),
  }));
}
