import { LcarsCollapsiblePanel } from "@/components/lcars";
import SessionRsvp from "@/components/session/SessionRsvp";
import SessionRsvpReminder from "@/components/session/SessionRsvpReminder";
import {
  countRsvps,
  formatSessionMoment,
  ownResponse,
} from "@/lib/plannedSessionFormat";
import type { PlannedSession } from "@/lib/plannedSessionTypes";

// „Nächste Spieltermine" auf dem Dashboard: was die Spielleitung angekündigt
// hat, mit Zu- und Absage. Die Namen der Rückmeldungen sind für die Runde
// sichtbar, die GM-Mail erinnert gezielt an offene Antworten.
//
// Ohne Termine fällt der Abschnitt weg.
export default function UpcomingSessionsSection({
  sessions,
  userId,
  canRsvp,
  canRemind,
}: {
  sessions: PlannedSession[];
  userId: number;
  // Zu- und absagen darf, wer kein Gast ist (users.browse).
  canRsvp: boolean;
  // Nur die Spielleitung darf Erinnerungen versenden (gm.access).
  canRemind: boolean;
}) {
  if (sessions.length === 0) return null;

  const nextCounts = countRsvps(sessions[0]);
  const badge = (
    <span
      className="inline-flex items-center gap-[5px]"
      aria-label={`${nextCounts.yes} zugesagt, ${nextCounts.no} abgesagt, ${nextCounts.pending} ohne Rückmeldung`}
      title="Rückmeldungen zum nächsten Termin: Zusage – Absage – keine Rückmeldung"
    >
      <span className="text-lcars-senary-ink">{nextCounts.yes}</span>
      <span aria-hidden="true">–</span>
      <span className="text-lcars-quinary-ink">{nextCounts.no}</span>
      <span aria-hidden="true">–</span>
      <span className="text-lcars-tertiary-ink">{nextCounts.pending}</span>
    </span>
  );

  return (
    <LcarsCollapsiblePanel
      title="Nächste Spieltermine"
      badge={badge}
      storageId="dashboard:spielabende"
    >
      <div className="flex flex-col gap-[10px]">
        {sessions.map((s) => {
          const counts = countRsvps(s);
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
                  <b>Rückmeldungen</b> {counts.yes} zugesagt · {counts.no} abgesagt ·{" "}
                  {counts.pending} offen
                </span>
              </p>
              {s.notes && (
                <div
                  className="session-card-notes mission-body"
                  dangerouslySetInnerHTML={{ __html: s.notesHtml }}
                />
              )}
              {(["yes", "no", null] as const).map((response) => {
                const people = s.participants
                  .filter((participant) => participant.response === response)
                  .map((participant) => participant.userName);
                if (people.length === 0) return null;
                const label =
                  response === "yes"
                    ? "Zugesagt"
                    : response === "no"
                      ? "Abgesagt"
                      : "Noch keine Rückmeldung";
                return (
                  <p key={response ?? "pending"} className="session-card-meta">
                    <span>
                      <b>{label}</b> {people.join(" · ")}
                    </span>
                  </p>
                );
              })}
              {canRsvp && (
                <SessionRsvp sessionId={s.id} own={ownResponse(s, userId)} />
              )}
              {canRemind && counts.pending > 0 && (
                <SessionRsvpReminder
                  sessionId={s.id}
                  unansweredCount={counts.pending}
                />
              )}
            </div>
          );
        })}
      </div>
    </LcarsCollapsiblePanel>
  );
}
