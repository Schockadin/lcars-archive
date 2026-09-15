"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  createPlannedSession,
  deletePlannedSession,
  getPlannedSessionPlayers,
  updatePlannedSession,
} from "@/lib/plannedSessions";
import {
  formatSessionMoment,
  isUpcoming,
  parsePlannedSession,
} from "@/lib/plannedSessionFormat";
import { listActiveCharactersForAp } from "@/lib/gameSessions";
import { sendPlannedSessionAnnouncedEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { logCaughtError } from "@/lib/errorLog";

export interface PlannedSessionState {
  error?: string;
  success?: string;
}

// Termine pflegt die Spielleitung (requireGM prüft das Recht frisch aus der
// DB). Das Zu- und Absagen liegt NICHT hier, sondern in der Route
// /api/rsvp — es war die einzige Aktion, die vom Dashboard ("/") aus lief,
// und genau sie scheiterte in der Netlify-Umgebung mit einem 403 (die
// Begründung steht ausführlich in src/app/api/rsvp/route.ts).
//
// Nach jeder Änderung beide Seiten neu bauen: die Verwaltung unter
// /gm/sessions und das Dashboard, auf dem der Termin steht.
function revalidateBoth(): void {
  revalidatePath("/gm/sessions");
  revalidatePath("/");
}

function formFields(formData: FormData) {
  return {
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    title: String(formData.get("title") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    characterIds: formData.getAll("characterIds").map(String),
  };
}

// Wie bei den gespielten Sessions: nur aktive Akten mit Konto dürfen in die
// Planung — ein manipuliertes Formular soll keine fremde oder zurückgezogene
// Figur eintragen.
async function allowedCharacters(ids: number[]): Promise<number[] | null> {
  const allowed = new Set(
    (await listActiveCharactersForAp()).map((character) => character.id),
  );
  const kept = ids.filter((id) => allowed.has(id));
  return kept.length === ids.length ? kept : null;
}

export async function createPlannedSessionAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  const user = await requireGM();
  const parsed = parsePlannedSession(formFields(formData));
  if (!parsed.ok) return { error: parsed.error };

  const characterIds = await allowedCharacters(parsed.characterIds);
  if (characterIds === null) {
    return { error: "Mindestens eine ausgewählte Figur ist nicht (mehr) aktiv." };
  }

  await createPlannedSession({ ...parsed, characterIds }, user.id);
  revalidateBoth();

  const notified = await notifyPlannedSessionPlayers(
    { ...parsed, characterIds },
    user.id,
  );
  return {
    success:
      notified > 0
        ? `Termin angekündigt, ${notified} ${notified === 1 ? "Person" : "Personen"} benachrichtigt.`
        : "Termin angekündigt.",
  };
}

// Wer mit einer Figur eingeplant ist, erfährt von einem neuen Termin per
// Mail/Push — bis v1.38 stand er nur auf dem Dashboard und wurde entsprechend
// übersehen. Kein Opt-in nötig (wie bei einer neuen Mission mit eigener
// Figur), die globalen Schalter für Mail und Push gelten aber weiterhin.
//
// Nur für Termine in der ZUKUNFT: Trägt die Spielleitung einen vergangenen
// Abend nach, um ihn festzuhalten, ist das keine Ankündigung — und er stünde
// auch auf keinem Dashboard (siehe listUpcomingSessions).
//
// Die eigene Person bleibt außen vor: Über die eigene Aktion muss niemand
// benachrichtigt werden. Sequentiell statt Promise.all wie überall sonst beim
// Versand — parallele Resend-Aufrufe riskieren ein Rate-Limit, bei dem
// einzelne Mails ohne Fehlermeldung verloren gingen. Ein fehlgeschlagener
// Versand wird protokolliert, lässt den Termin aber stehen: Er ist angelegt,
// die Nachricht ist Beiwerk.
//
// Rückgabe: wie viele Personen tatsächlich erreicht wurden — die
// Rückmeldung im Formular sagt das ehrlich, statt Versand zu behaupten.
async function notifyPlannedSessionPlayers(
  session: {
    scheduledAt: string;
    title: string;
    location: string;
    notes: string;
    characterIds: number[];
  },
  actingUserId: number,
): Promise<number> {
  if (!isUpcoming(session.scheduledAt)) return 0;

  const players = (await getPlannedSessionPlayers(session.characterIds)).filter(
    (player) => player.id !== actingUserId,
  );
  if (players.length === 0) return 0;

  const dashboardUrl = await getBaseUrl();
  const scheduledAtLabel = formatSessionMoment(session.scheduledAt);
  let reached = 0;
  for (const player of players) {
    let sent = false;
    if (player.emailNotificationsEnabled) {
      const result = await sendPlannedSessionAnnouncedEmail({
        to: player.email,
        name: player.name,
        characterNames: player.characterNames,
        sessionTitle: session.title,
        scheduledAtLabel,
        location: session.location,
        notes: session.notes,
        dashboardUrl,
      });
      if (result.sent) {
        sent = true;
      } else {
        const message = `Spieltermin-Mail an ${player.email} fehlgeschlagen: ${result.error}`;
        console.error(message);
        void logCaughtError(
          new Error(message),
          "actions/plannedSessions.ts:notifyPlannedSessionPlayers",
        );
      }
    }
    if (player.pushNotificationsEnabled) {
      // Ein angehakter Push-Schalter heißt noch nicht, dass ein Gerät
      // angemeldet ist — nur eine tatsächlich zugestellte Nachricht zählt
      // für die Rückmeldung als „erreicht".
      const push = await sendPushToUser(player.id, {
        title: session.title
          ? `Neuer Spieltermin: ${session.title}`
          : "Neuer Spieltermin",
        body: session.location
          ? `${scheduledAtLabel} · ${session.location}`
          : scheduledAtLabel,
        url: dashboardUrl,
      });
      if (push.sent > 0) sent = true;
    }
    if (sent) reached++;
  }
  return reached;
}

export async function updatePlannedSessionAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  await requireGM();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Unbekannter Termin." };

  const parsed = parsePlannedSession(formFields(formData));
  if (!parsed.ok) return { error: parsed.error };

  const characterIds = await allowedCharacters(parsed.characterIds);
  if (characterIds === null) {
    return { error: "Mindestens eine ausgewählte Figur ist nicht (mehr) aktiv." };
  }

  await updatePlannedSession(id, { ...parsed, characterIds });
  revalidateBoth();
  return { success: "Termin geändert." };
}

export async function deletePlannedSessionAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  await requireGM();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Unbekannter Termin." };

  await deletePlannedSession(id);
  revalidateBoth();
  return { success: "Termin abgesagt und entfernt." };
}
