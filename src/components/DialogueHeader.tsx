import Link from "next/link";
import { fmtDate } from "@/lib/missionFormat";
import type { ArchiveParticipant, ArchiveLocationRef } from "@/types/archive";

// Dialog-Header: Titel, verlinkte Teilnehmer + Ort + Datum. Genutzt sowohl
// von /archive/[slug] (abgeschlossene Dialoge) als auch /dialogues/[slug]
// (offene Dialoge) — identisches Markup für beide Zustände.
export default function DialogueHeader({
  title,
  participants,
  location,
  logDate,
}: {
  title: string;
  participants: ArchiveParticipant[];
  location: ArchiveLocationRef | null;
  logDate: string | null;
}) {
  return (
    <header className="archive-entry-head">
      <h1 className="char-file-name text-left">{title}</h1>

      <div className="archive-dialogue-meta">
        {participants.length > 0 && (
          <div className="archive-dialogue-row">
            <span className="archive-dialogue-label">Teilnehmer</span>
            <div className="archive-related-grid">
              {participants.map((p) =>
                p.kind === "unknown" ? (
                  // Kein eigener Eintrag → nur Name, kein Link.
                  <span
                    key={p.slug}
                    className="archive-chip archive-chip-static"
                    style={
                      {
                        "--chip-color": "var(--lcars-text-dim)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="archive-chip-title">{p.name}</span>
                  </span>
                ) : (
                  <Link
                    key={p.slug}
                    href={
                      p.kind === "character"
                        ? `/characters/${p.slug}`
                        : `/archive/${p.slug}`
                    }
                    className="archive-chip"
                    style={
                      {
                        "--chip-color": "var(--lcars-blue)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="archive-chip-title">{p.name}</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        )}

        {location && (
          <div className="archive-dialogue-row">
            <span className="archive-dialogue-label">Ort</span>
            <Link
              href={`/archive/${location.slug}`}
              className="archive-chip"
              style={
                { "--chip-color": "var(--lcars-green)" } as React.CSSProperties
              }
            >
              <span className="archive-chip-title">{location.title}</span>
            </Link>
          </div>
        )}

        {logDate && (
          <div className="archive-dialogue-row">
            <span className="archive-dialogue-label">Datum</span>
            <span className="archive-dialogue-value">{fmtDate(logDate)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
