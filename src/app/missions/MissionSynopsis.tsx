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
          <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
        </div>
      </header>

      {mission.synopsis ? (
        <div className="mission-body lcars-text">
          {mission.synopsis
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>
      ) : (
        <p className="char-file-bio-empty">Keine Zusammenfassung vorhanden</p>
      )}
    </article>
  );
}
