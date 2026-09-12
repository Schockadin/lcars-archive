"use client";
import { useState } from "react";
import Link from "next/link";
import { MissionDetail } from "@/types/missions";
import { STATUS_CONFIG, periodLabel } from "@/lib/missionFormat";
import type { Viewer } from "@/lib/visibility";
import type { FollowState } from "@/app/actions/follows";
import MissionSynopsisEditor from "./MissionSynopsisEditor";
import ContentActionsPanel from "@/components/ContentActionsPanel";
import ContentBody from "@/components/ContentBody";
import { ChronoPanel } from "@/components/timeline/ChronoCard";
import ContentDetailHeader, {
  ContentChip,
  ContentChipList,
  ContentMetaValue,
} from "@/components/ContentDetailHeader";
import { LcarsReadingModeToggle } from "@/components/lcars";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { MISSION_PATH, characterHref } from "@/lib/contentRoutes";

// Rechte Spalte der Mission-Detailseite: Synopsis + Metadaten.
export default function MissionSynopsis({
  mission,
  viewer,
  owners,
  followInitialState,
}: {
  mission: MissionDetail;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  followInitialState?: FollowState;
}) {
  const cfg = STATUS_CONFIG[mission.status];
  const [editMode, setEditMode] = useState(false);

  return (
    <article className="mission-detail-article">
      {/* Zurück zur Missionsliste. Der Link saß bis zum Redesign im Kopf der
          Log-Schiene; ohne sie führte von hier kein Weg mehr zurück. Wie
          „‹ Charaktere"/„‹ Gespräche" zeigt er auf die Liste, aus der der
          Eintrag stammt. */}
      <div className="flex flex-col items-start gap-[8px]">
        <Link href={MISSION_PATH} className="lcars-back-link">
          ‹ Missionen
        </Link>
        <LcarsReadingModeToggle />
      </div>
      <ContentDetailHeader
        title={mission.title}
        rows={[
          {
            label: "Status",
            // Der Status stand bisher nur als Farbe in der Log-Liste — das
            // Label aus STATUS_CONFIG wurde nirgends gerendert.
            children: <ContentChip color={cfg.color} title={cfg.label} />,
          },
          {
            label: "Zeitraum",
            children: (
              <ContentMetaValue>
                {periodLabel(mission.started_at, mission.ended_at)}
              </ContentMetaValue>
            ),
          },
          mission.participants.length > 0 && {
            label: "Teilnehmer",
            children: (
              <ContentChipList>
                {mission.participants.map((p) => (
                  <ContentChip
                    key={p.slug}
                    href={characterHref(p.slug)}
                    color={CONTENT_TYPE_COLOR.character}
                    title={p.name}
                  />
                ))}
              </ContentChipList>
            ),
          },
        ]}
      />

      {/* Client-Komponente: Recht direkt am (bereits aufgelösten) permissions-
          Array prüfen — NICHT über viewerHasPermission aus visibility.ts, das
          "server-only" ist und die DB-Kette (roles.ts → db.ts) in den
          Client-Bundle ziehen würde (gleiches Muster wie ActionsMenu.tsx). */}
      {viewer?.permissions.includes("missions.manage") ? (
        <MissionSynopsisEditor
          missionId={mission.id}
          bodyHtml={mission.metadata.body}
          sourceMarkdown={mission.sourceMarkdown ?? ""}
          slug={mission.slug}
          editMode={editMode}
          onEditModeChange={setEditMode}
        />
      ) : (
        <ChronoPanel
          label="Zusammenfassung"
          open
          className="mission-synopsis-panel"
        >
          {mission.metadata.body ? (
            <ContentBody html={mission.metadata.body} />
          ) : (
            <p className="lcars-empty-state">Keine Zusammenfassung vorhanden</p>
          )}
        </ChronoPanel>
      )}
      <ContentActionsPanel
        viewer={viewer}
        owners={owners}
        contentType="mission"
        followType="mission"
        followInitialState={followInitialState}
        content={mission}
        playerId={mission.ownerUserId}
        onEdit={() => setEditMode(true)}
        imageContentType="mission"
        imageContentId={mission.id}
      />
    </article>
  );
}
