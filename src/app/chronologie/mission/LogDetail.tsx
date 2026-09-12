"use client";
import Link from "next/link";
import {
  LogNavItem,
  LogNavNeighbors,
  MissionLogDetail,
} from "@/types/missions";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";
import { LcarsReadingModeToggle } from "@/components/lcars";
import ContentBody from "@/components/ContentBody";
import ContentDetailHeader, {
  ContentChip,
  ContentMetaValue,
} from "@/components/ContentDetailHeader";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { useNeo } from "@/hooks/useNeo";
import {
  characterHref,
  missionHref,
  missionLogHref,
} from "@/lib/contentRoutes";

// Ein Sprung zum Nachbar-Log desselben Autors. `dir` steuert Pfeil + Ausrichtung.
function LogNavLink({ item, dir }: { item: LogNavItem; dir: "prev" | "next" }) {
  const { preserveReadingModeOnce } = useNeo();
  const meta = [sessionLabel(item.session_nr), fmtDate(item.log_date)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={missionLogHref(item.mission_slug, item.slug)}
      onClick={preserveReadingModeOnce}
      className={`log-nav-link log-nav-${dir}`}
    >
      <span className="log-nav-dir" aria-hidden="true">
        {dir === "prev" ? "‹" : "›"}
      </span>
      <span className="log-nav-body">
        <span className="log-nav-title">
          {dir === "prev" ? "Vorheriges Log" : "Nächstes Log"}
        </span>
        {/* <span className="log-nav-title">{item.title}</span> */}
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
      {/* Zurück zur Mission: Seit die Logbuch-Übersicht in der Missionsseite
          steht statt in einer mitscrollenden Schiene daneben, ist dieser Link
          der Weg zurück — wie „‹ Charaktere"/„‹ Gespräche" zeigt er auf die
          Liste, aus der der Eintrag stammt. */}
      <div className="flex flex-col items-start gap-[8px]">
        <Link href={missionHref(log.mission_slug)} className="lcars-back-link">
          ‹ {log.mission_title}
        </Link>
        <LcarsReadingModeToggle />
      </div>
      <ContentDetailHeader
        title={log.title}
        rows={[
          log.log_date && {
            label: "Datum",
            children: (
              <ContentMetaValue>{fmtDate(log.log_date)}</ContentMetaValue>
            ),
          },
          log.author_name && {
            label: "Autor",
            children: log.author_slug ? (
              <ContentChip
                href={characterHref(log.author_slug)}
                color={CONTENT_TYPE_COLOR.character}
                title={log.author_name}
              />
            ) : (
              // Autor ohne eigenen Charaktereintrag → Chip ohne Link.
              <ContentChip
                color="var(--lcars-ink-dim)"
                title={log.author_name}
              />
            ),
          },
        ]}
      />

      <ContentBody html={log.content} imageAlt={`Bild aus „${log.title}“`} />

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
