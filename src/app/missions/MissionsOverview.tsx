import Link from "next/link";
import { MissionPreview } from "@/types/missions";
import { STATUS_CONFIG, periodLabel, yearOf } from "@/lib/missionFormat";

// Übersicht aller Missionen als LCARS-Chronik (Zeitstrahl mit dekorativer
// Jahres-Schiene, neueste zuerst). Jede Akte verlinkt auf ihre Detailseite.
export default function MissionsOverview({
  missions,
}: {
  missions: MissionPreview[];
}) {
  const years = missions
    .map((m) => yearOf(m.started_at))
    .filter((y): y is number => y != null);
  const latestYear = years.length ? Math.max(...years) : null;
  const earliestYear = years.length ? Math.min(...years) : null;

  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-[16px]">
        <h1 className="lcars-data-row-heading">Missionen</h1>
        <p className="lcars-eyebrow">Zeitstrahl der Kampagne · neueste zuerst</p>
      </div>

      {missions.length === 0 ? (
        <p className="char-file-bio-empty">
          Keine Missionen im Archiv hinterlegt.
        </p>
      ) : (
        <div className="mission-chronik">
          <div className="mission-rail" aria-hidden="true">
            <div className="mission-rail-cap">{latestYear ?? ""}</div>
            <div className="mission-rail-fill" />
            <div className="mission-rail-foot">
              {earliestYear && earliestYear !== latestYear ? earliestYear : ""}
            </div>
          </div>

          <div className="mission-list">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MissionCard({ mission }: { mission: MissionPreview }) {
  const cfg = STATUS_CONFIG[mission.status];
  const code = `M-${String(mission.id).padStart(2, "0")}`;

  return (
    <Link
      href={`/missions/${mission.slug}`}
      className="mission-akte"
      aria-label={`${mission.title} — ${cfg.label}`}
      style={{ "--mission-color": cfg.color } as React.CSSProperties}
    >
      <span className="mission-akte-rail" />
      <span className="mission-akte-body text-left">
        <span className="mission-akte-title block">{mission.title}</span>
        {mission.summary && (
          <span className="mission-akte-summary block">{mission.summary}</span>
        )}
        <span className="mission-akte-meta">
          <span>
            <b>Code</b> {code}
          </span>
          <span>
            <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
          </span>
          <span>
            <b>Logs</b> {mission.log_count}
          </span>
        </span>
      </span>
    </Link>
  );
}
