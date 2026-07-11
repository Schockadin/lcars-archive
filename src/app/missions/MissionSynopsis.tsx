"use client";
import { useState } from "react";
import Link from "next/link";
import { MissionDetail } from "@/types/missions";
import { STATUS_CONFIG, periodLabel } from "@/lib/missionFormat";
import { Viewer } from "@/lib/visibility";
import { UserWithCharacters } from "@/lib/users";
import MissionSynopsisEditor from "./MissionSynopsisEditor";
import ActionsMenu from "@/components/ActionsMenu";

// Rechte Spalte der Mission-Detailseite: Synopsis + Metadaten.
export default function MissionSynopsis({
  mission,
  viewer,
  owners,
}: {
  mission: MissionDetail;
  viewer: Viewer | null;
  owners: UserWithCharacters[];
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

      {viewer?.role === "admin" || viewer?.role === "gm" ? (
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
            <div
              className="mission-body lcars-text"
              dangerouslySetInnerHTML={{ __html: mission.metadata.body }}
            />
          ) : (
            <p className="lcars-empty-state">Keine Zusammenfassung vorhanden</p>
          )}
        </>
      )}
    </article>
  );
}
