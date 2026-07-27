"use client";
import { useState } from "react";
import Link from "next/link";
import { MissionDetail } from "@/types/missions";
import { STATUS_CONFIG, periodLabel } from "@/lib/missionFormat";
import { Viewer } from "@/lib/visibility";
import MissionSynopsisEditor from "./MissionSynopsisEditor";
import ActionsMenu from "@/components/ActionsMenu";
import ContentBody from "@/components/ContentBody";

// Rechte Spalte der Mission-Detailseite: Synopsis + Metadaten.
export default function MissionSynopsis({
  mission,
  viewer,
  owners,
}: {
  mission: MissionDetail;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
}) {
  const cfg = STATUS_CONFIG[mission.status];
  const [editMode, setEditMode] = useState(false);

  return (
    <article className="mission-detail-article">
      <header
        className="mission-detail-header"
        style={{ "--mission-color": cfg.color } as React.CSSProperties}
      >
        <h1 className="mission-detail-title">{mission.title}</h1>
        <div className="lcars-meta-row">
          <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
        </div>
        {mission.participants.length > 0 && (
          <div className="lcars-meta-row">
            <b>Teilnehmer</b>{" "}
            {mission.participants.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ", "}
                <Link href={`/characters/${p.slug}`}>{p.name}</Link>
              </span>
            ))}
          </div>
        )}
      </header>

      <ActionsMenu
        viewer={viewer}
        owners={owners}
        contentType="mission"
        followType="mission"
        content={mission}
        playerId={mission.ownerUserId}
        onEdit={() => setEditMode(true)}
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
        <>
          {mission.metadata.body ? (
            <ContentBody html={mission.metadata.body} />
          ) : (
            <p className="lcars-empty-state">Keine Zusammenfassung vorhanden</p>
          )}
        </>
      )}
    </article>
  );
}
