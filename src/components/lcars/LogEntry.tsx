import Link from "next/link";
import { fmtDate } from "@/lib/missionFormat";

// Eine Zeile in einer Log-Liste (Stub + Titel + optionale Meta-Zeile),
// verwendet sowohl für die Missions-Log-Liste als auch die Charakter-Log-
// Liste. `active` steuert die aktuelle-Seite-Hervorhebung.
export default function LogEntry({
  href,
  stub,
  title,
  secondaryLabel,
  date,
  active = false,
  className = "",
}: {
  href: string;
  stub: string;
  title: React.ReactNode;
  secondaryLabel?: string | null;
  date?: string | null;
  active?: boolean;
  className?: string;
}) {
  const hasMeta = Boolean(secondaryLabel || date);

  return (
    <Link
      href={href}
      className={`mission-log-entry ${className}`}
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
    >
      <span className="mission-log-stub">{stub}</span>
      <span className="mission-log-bar">
        <span className="mission-log-name">{title}</span>
        {hasMeta && (
          <span className="mission-log-meta">
            {secondaryLabel && (
              <span className="mission-log-author">{secondaryLabel}</span>
            )}
            {date && <span className="mission-log-date">{fmtDate(date)}</span>}
          </span>
        )}
      </span>
    </Link>
  );
}
