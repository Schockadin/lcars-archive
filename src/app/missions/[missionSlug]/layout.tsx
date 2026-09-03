import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getLogsByMissionId,
  getMissionBySlug,
  getMissionParticipantIds,
} from "@/lib/missions";
import { getCharactersForUser } from "@/lib/characters";
import { STATUS_CONFIG } from "@/lib/missionFormat";
import { getViewer } from "@/lib/visibility";
import { LcarsSkeleton } from "@/components/lcars";
import PageMeta from "@/components/PageMeta";
import MissionLogList from "../MissionLogList";

// Persistentes Layout der Mission-Detailseite: links die Log-Liste (bleibt
// beim Wechsel Mission ⇄ Log erhalten), rechts die jeweilige Page.
//
// Unter cacheComponents ist der Layout-Inhalt betrachter- und
// parameterabhängig (await params, getViewer() → cookies()) und liegt deshalb
// in einer Suspense-Grenze. Die Farb-Variable (--mission-color) sitzt auf dem
// gemeinsamen Wrapper beider Spalten, daher wird der komplette Aufbau in einer
// eigenen async-Komponente gerendert und children als Pass-Through
// durchgereicht. Der Fallback zeigt bereits die Zielspalte (children) mit
// einem Skeleton für die Log-Liste, damit der Wechsel Mission ⇄ Log flüssig
// bleibt.
export default function MissionDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ missionSlug: string }>;
}) {
  return (
    <Suspense
      fallback={<MissionDetailFallback>{children}</MissionDetailFallback>}
    >
      <MissionDetailShell params={params}>{children}</MissionDetailShell>
    </Suspense>
  );
}

async function MissionDetailShell({
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

  // "Neues Log"-Button in der Log-Liste nur, wer mit einem eigenen Charakter
  // tatsächlich an DIESER Mission teilnimmt (mission_participants) — nicht
  // schon bei irgendeinem eigenen Charakter, da der Button kontextbezogen
  // auf genau diese Mission verlinkt.
  const viewer = await getViewer();
  const [characters, participantIds] = viewer
    ? await Promise.all([
        getCharactersForUser(viewer.userId),
        getMissionParticipantIds(mission.id),
      ])
    : [[], []];
  const canCreateLog = characters.some((c) => participantIds.includes(c.id));

  return (
    <div
      className="mission-detail lcars-split"
      style={{ "--mission-color": color } as React.CSSProperties}
    >
      <PageMeta title={mission.title} section="missions" />

      <aside className="mission-detail-logs lcars-scroll">
        <MissionLogList
          missionSlug={mission.slug}
          logs={logs}
          canCreateLog={canCreateLog}
        />
      </aside>

      <div className="mission-detail-main">{children}</div>
    </div>
  );
}

// Fallback während der Layout-Inhalt (Mission + Betrachter) lädt: gleiches
// Zwei-Spalten-Gerüst mit Skeleton-Log-Liste, damit die Spalte nicht springt.
function MissionDetailFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="mission-detail lcars-split">
      <aside className="mission-detail-logs lcars-scroll">
        <div className="flex flex-col gap-[8px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <LcarsSkeleton
              key={i}
              className="h-[40px] w-full rounded-lcars-pill"
            />
          ))}
        </div>
      </aside>
      <div className="mission-detail-main">{children}</div>
    </div>
  );
}
