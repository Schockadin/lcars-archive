import { notFound } from "next/navigation";
import { getLogsByMissionId, getMissionBySlug } from "@/lib/missions";
import { STATUS_CONFIG } from "@/lib/missionFormat";
import PageMeta from "@/components/PageMeta";
import CrumbLabel from "@/components/CrumbLabel";
import MissionLogList from "../MissionLogList";

// Persistentes Layout der Mission-Detailseite: links die Log-Liste (bleibt
// beim Wechsel Mission ⇄ Log erhalten), rechts die jeweilige Page.
export default async function MissionDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ missionSlug: string }>;
}) {
  const { missionSlug } = await params;
  const mission = await getMissionBySlug(missionSlug);
  if (!mission) notFound();

  const logs = await getLogsByMissionId(mission.id);
  const color = STATUS_CONFIG[mission.status].color;

  return (
    <div
      className="mission-detail"
      style={{ "--mission-color": color } as React.CSSProperties}
    >
      <PageMeta title={mission.title} section="missions" />
      <CrumbLabel slug={mission.slug} label={mission.title} />

      <aside className="mission-detail-logs lcars-scroll">
        <MissionLogList
          missionSlug={mission.slug}
          summary={mission.summary}
          logs={logs}
        />
      </aside>

      <div className="mission-detail-main">{children}</div>
    </div>
  );
}
