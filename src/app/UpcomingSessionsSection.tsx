import { LcarsDataRow } from "@/components/lcars";
import SessionRsvp from "@/components/session/SessionRsvp";
import {
  countRsvps,
  formatSessionMoment,
  ownResponse,
} from "@/lib/plannedSessionFormat";
import type { PlannedSession } from "@/lib/plannedSessionTypes";

// „Nächste Spieltermine" auf dem Dashboard: was die Spielleitung angekündigt
// hat, mit Zu- und Absage. Aufgeklappt wie die offenen Gespräche — ein
// Termin, den man erst aufklappen muss, erinnert an nichts.
//
// Ohne Termine fällt der Abschnitt weg.
export default function UpcomingSessionsSection({
  sessions,
  userId,
}: {
  sessions: PlannedSession[];
  userId: number;
}) {
  if (sessions.length === 0) return null;

  return (
    <LcarsDataRow
      value={sessions.length}
      label="Nächste Spieltermine"
      defaultOpen
    >
      <div className="flex flex-col gap-[10px]">
        {sessions.map((s) => {
          const counts = countRsvps(s);
          const zusagen = s.rsvps.filter((r) => r.response === "yes");
          return (
            <div key={s.id} className="session-card">
              <p className="session-card-when">
                {formatSessionMoment(s.scheduledAt)}
              </p>
              {s.title && <p className="session-card-title">{s.title}</p>}
              <p className="session-card-meta">
                {s.location && (
                  <span>
                    <b>Wo</b> {s.location}
                  </span>
                )}
                <span>
                  <b>Zusagen</b> {counts.yes}
                  {counts.no > 0 ? ` · ${counts.no} abgesagt` : ""}
                </span>
              </p>
              {s.notes && <p className="session-card-notes">{s.notes}</p>}
              {zusagen.length > 0 && (
                <p className="session-card-meta">
                  <span>
                    <b>Dabei</b> {zusagen.map((r) => r.userName).join(" · ")}
                  </span>
                </p>
              )}
              <SessionRsvp sessionId={s.id} own={ownResponse(s, userId)} />
            </div>
          );
        })}
      </div>
    </LcarsDataRow>
  );
}
