import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/dal";
import { formatSessionMoment, isUpcoming } from "@/lib/plannedSessionFormat";
import {
  getPlannedSession,
  getPlannedSessionPlayers,
} from "@/lib/plannedSessions";
import { sendPlannedSessionReminderEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/http";
import { logCaughtError } from "@/lib/errorLog";

// GM-Erinnerung aus dem Dashboard. Wie /api/rsvp als Route umgesetzt, da
// Aktionen von der Startseite in der Netlify-Umgebung zu 403-Fehlern führten.
// Das Recht wird serverseitig geprüft; die Anzeige der Schaltfläche ist keine
// Zugriffskontrolle.
export async function POST(request: Request): Promise<Response> {
  const check = await checkPermission("gm.access");
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: 403 });
  }

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Unbekannter Termin." }, { status: 400 });
  }

  try {
    const session = await getPlannedSession(id);
    if (!session) {
      return NextResponse.json(
        { error: "Termin nicht gefunden." },
        { status: 404 },
      );
    }
    if (session.gameSessionId !== null || !isUpcoming(session.scheduledAt)) {
      return NextResponse.json(
        { error: "Erinnerungen sind nur für zukünftige Termine möglich." },
        { status: 409 },
      );
    }

    const pendingIds = new Set(
      session.participants
        .filter((participant) => participant.response === null)
        .map((participant) => participant.userId),
    );
    if (pendingIds.size === 0) {
      return NextResponse.json({
        sent: 0,
        skipped: 0,
        failed: 0,
        message: "Alle eingeplanten Personen haben bereits geantwortet.",
      });
    }

    const allPlayers = await getPlannedSessionPlayers(session.characterIds);
    const players = allPlayers.filter((player) => pendingIds.has(player.id));
    const emailPlayers = players.filter(
      (player) => player.emailNotificationsEnabled,
    );
    const skipped = pendingIds.size - emailPlayers.length;
    const dashboardUrl = emailPlayers.length > 0 ? await getBaseUrl() : "";
    let sent = 0;
    let failed = 0;

    for (const player of emailPlayers) {
      const result = await sendPlannedSessionReminderEmail({
        to: player.email,
        name: player.name,
        sessionTitle: session.title,
        scheduledAtLabel: formatSessionMoment(session.scheduledAt),
        location: session.location,
        dashboardUrl,
      });
      if (result.sent) {
        sent++;
      } else {
        failed++;
        const message = `Spieltermin-Erinnerung an ${player.email} fehlgeschlagen: ${result.error}`;
        console.error(message);
        void logCaughtError(
          new Error(message),
          "api/planned-session-reminder/route.ts:POST",
        );
      }
    }

    const details = [
      `${sent} ${sent === 1 ? "Erinnerungs-Mail" : "Erinnerungs-Mails"} verschickt`,
    ];
    if (skipped > 0) {
      details.push(
        `${skipped} wegen Konto- oder Mail-Einstellungen ausgelassen`,
      );
    }
    if (failed > 0) details.push(`${failed} fehlgeschlagen`);

    return NextResponse.json({
      sent,
      skipped,
      failed,
      message: `${details.join("; ")}.`,
    });
  } catch (error) {
    console.error("POST /api/planned-session-reminder", error);
    void logCaughtError(error, "api/planned-session-reminder/route.ts:POST");
    return NextResponse.json(
      { error: "Die Erinnerungen konnten nicht gesendet werden." },
      { status: 500 },
    );
  }
}
