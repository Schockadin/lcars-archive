import Link from "next/link";
import {
  LogNavItem,
  LogNavNeighbors,
  MissionLogDetail,
} from "@/types/missions";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";
import { LcarsReadingModeToggle } from "@/components/lcars";

// Ein Sprung zum Nachbar-Log desselben Autors. `dir` steuert Pfeil + Ausrichtung.
function LogNavLink({ item, dir }: { item: LogNavItem; dir: "prev" | "next" }) {
  const meta = [sessionLabel(item.session_nr), fmtDate(item.log_date)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/missions/${item.mission_slug}/${item.slug}`}
      className={`log-nav-link log-nav-${dir}`}
    >
      <span className="log-nav-dir" aria-hidden="true">
        {dir === "prev" ? "‹" : "›"}
      </span>
      <span className="log-nav-body">
        <span className="log-nav-label">
          {dir === "prev" ? "Vorheriges Log" : "Nächstes Log"}
        </span>
        <span className="log-nav-title">{item.title}</span>
        {meta && <span className="log-nav-meta">{meta}</span>}
      </span>
    </Link>
  );
}

// Rechte Spalte, wenn ein konkretes Log gewählt ist: Kopf + Log-Text.
export default function LogDetail({
  log,
  nav,
}: {
  log: MissionLogDetail;
  nav?: LogNavNeighbors;
}) {
  const hasNav = nav && (nav.prev || nav.next);

  return (
    <article className="mission-detail-article mb-[16px]">
      <LcarsReadingModeToggle />
      <header className="mission-detail-header">
        <div className="mission-detail-logmeta">
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

      {/* Navigation zu den Logs desselben Autors (chronologisch). */}
      {hasNav && (
        <nav className="log-nav" aria-label="Logs desselben Autors">
          {nav.prev ? (
            <LogNavLink item={nav.prev} dir="prev" />
          ) : (
            <span className="log-nav-spacer" />
          )}
          {nav.next ? (
            <LogNavLink item={nav.next} dir="next" />
          ) : (
            <span className="log-nav-spacer" />
          )}
        </nav>
      )}
    </article>
  );
}
