import { MissionDetail } from "@/types/missions";
import { STATUS_CONFIG, periodLabel } from "@/lib/missionFormat";

// Rechte Spalte der Mission-Detailseite: Synopsis + Metadaten.
export default function MissionSynopsis({
  mission,
}: {
  mission: MissionDetail;
}) {
  const cfg = STATUS_CONFIG[mission.status];

  return (
    <article className="mission-detail-article">
      <header
        className="mission-detail-header"
        style={{ "--mission-color": cfg.color } as React.CSSProperties}
      >
        <h1 className="mission-detail-title">{mission.title}</h1>
        <div className="mission-detail-meta">
          <span className="mission-detail-status">{cfg.label}</span>
          <span>
            <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
          </span>
          {mission.metadata.tags.length > 0 && (
            <span>
              <b>Tags</b> {mission.metadata.tags.join(", ")}
            </span>
          )}
        </div>
      </header>

      {mission.summary && (
        <p className="mission-detail-lead">{mission.summary}</p>
      )}

      {mission.metadata.body ? (
        <div
          className="mission-body lcars-text"
          dangerouslySetInnerHTML={{ __html: mission.metadata.body }}
        />
      ) : (
        <p className="char-file-bio-empty">
          Keine ausführliche Beschreibung hinterlegt.
        </p>
      )}
    </article>
  );
}
