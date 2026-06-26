import { getAllMissionLogs, getAllMissions } from "@/lib/missions";
import { MissionLogItem } from "@/types/missions";
import MissionsChronik from "./MissionsChronik";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "Missionen",
  },
};

export default async function MissionsPage() {
  const [missions, logs] = await Promise.all([
    getAllMissions(),
    getAllMissionLogs(),
  ]);

  // Logs pro Mission gruppieren (Reihenfolge der Query bleibt erhalten).
  const logsByMission: Record<number, MissionLogItem[]> = {};
  for (const log of logs) {
    (logsByMission[log.mission_id] ??= []).push(log);
  }

  return <MissionsChronik missions={missions} logsByMission={logsByMission} />;
}
