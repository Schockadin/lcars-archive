// Geteilte, React-freie Timeline-Helfer. Die frühere Timeline-Seite ist
// entfernt; verbleibt wird nur noch für den News-Feed (SOURCE_TYPE_LABELS,
// fmtDate) auf dem Dashboard genutzt.
export { fmtDate } from "@/lib/missionFormat";
import type { TimelineSourceType } from "@/types/timeline";

export const SOURCE_TYPE_LABELS: Record<TimelineSourceType, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Mission-Log",
  archive_entry: "Datenbank",
};
