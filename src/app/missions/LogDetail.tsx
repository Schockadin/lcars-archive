import Link from "next/link";
import { MissionLogDetail } from "@/types/missions";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";

// Rechte Spalte, wenn ein konkretes Log gewählt ist: Kopf + Log-Text.
export default function LogDetail({ log }: { log: MissionLogDetail }) {
  return (
    <article className="mission-detail-article">
      <header className="mission-detail-header">
        <div className="mission-detail-logmeta">
          <span className="mission-detail-session">
            {sessionLabel(log.session_nr)}
          </span>
          {log.log_date && <span>{fmtDate(log.log_date)}</span>}
          {log.author_name && (
            <span>
              <b>Autor</b>{" "}
              {log.author_slug ? (
                <Link href={`/characters/${log.author_slug}`}>
                  {log.author_name}
                </Link>
              ) : (
                log.author_name
              )}
            </span>
          )}
        </div>
        <h1 className="mission-detail-title">{log.title}</h1>
      </header>

      <div
        className="mission-body lcars-text"
        dangerouslySetInnerHTML={{ __html: log.content }}
      />
    </article>
  );
}
