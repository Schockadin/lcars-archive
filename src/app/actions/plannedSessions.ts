"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  createPlannedSession,
  deletePlannedSession,
  getPlannedSession,
  getPlannedSessionPlayers,
  updatePlannedSession,
} from "@/lib/plannedSessions";
import {
  formatSessionMoment,
  isUpcoming,
  parsePlannedSession,
} from "@/lib/plannedSessionFormat";
import { listActiveCharactersForAp } from "@/lib/gameSessions";
import { listActiveSessionMissions } from "@/lib/gameSessions";
import { createMission, missionSlugExists, setMissionParticipants } from "@/lib/missions";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import { slugifyBase } from "@/lib/slug";
import { parseList } from "@/lib/formParsing";
import { notifyContentChange } from "@/lib/follows";
import { missionHref } from "@/lib/contentRoutes";
import { notifyMissionParticipants } from "@/app/user/missions/_shared/contentAction";
import { sendPlannedSessionAnnouncedEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { logCaughtError } from "@/lib/errorLog";
import { synopsisExcerpt } from "@/lib/missionFormat";

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
// Nach jeder Änderung die Kampagnenplanung und das Dashboard aktualisieren.
function revalidateBoth(): void {
  revalidatePath("/gm/sessions");
  revalidatePath("/gm/campaign");
  revalidatePath("/gm/missions");
  revalidatePath("/");
}

function formFields(formData: FormData) {
  return {
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    missionId: String(formData.get("missionId") ?? ""),
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
  const rawFields = formFields(formData);
  const createNewMission = rawFields.missionId === "new";
  const parsed = parsePlannedSession({
    ...rawFields,
    missionId: createNewMission ? "1" : rawFields.missionId,
  });
  if (!parsed.ok) return { error: parsed.error };

  const characterIds = await allowedCharacters(parsed.characterIds);
  if (characterIds === null) {
    return { error: "Mindestens eine ausgewählte Figur ist nicht (mehr) aktiv." };
  }

  let missionId = parsed.missionId;
  if (createNewMission) {
    const title = String(formData.get("missionTitle") ?? "").trim();
    const slugInput = String(formData.get("missionSlug") ?? "").trim();
    const slug = slugifyBase(slugInput || title);
    const startedAt = String(formData.get("missionStartedAt") ?? "").trim();
    const endedAt = String(formData.get("missionEndedAt") ?? "").trim();
    const teaser = String(formData.get("missionTeaser") ?? "").trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!title || title.length > 200) return { error: "Bitte einen Missionsnamen mit höchstens 200 Zeichen angeben." };
    if (!slug || slug.length > 200) return { error: "Bitte einen gültigen Missions-Slug angeben." };
    if (startedAt && !datePattern.test(startedAt)) return { error: "Ungültiges Startdatum der Mission." };
    if (endedAt && !datePattern.test(endedAt)) return { error: "Ungültiges Enddatum der Mission." };
    if (startedAt && endedAt && endedAt < startedAt) return { error: "Das Missionsende darf nicht vor dem Start liegen." };
    if (teaser.length > 1000) return { error: "Der Missionsteaser darf höchstens 1000 Zeichen lang sein." };
    if (await missionSlugExists(slug)) return { error: "Dieser Missions-Slug ist bereits vergeben." };

    const participantIds = formData.getAll("participantCharacterIds").map((value) => Number(value));
    const available = new Set((await getCharactersForParticipantPicker()).filter((character) => character.status === "active").map((character) => character.id));
    if (participantIds.some((id) => !Number.isInteger(id) || !available.has(id))) {
      return { error: "Mindestens ein ausgewählter Missionscharakter ist nicht mehr verfügbar." };
    }
    const uniqueParticipantIds = [...new Set(participantIds)];
    const createdMission = await createMission({
      slug,
      title,
      status: "active",
      startedAt: startedAt || null,
      endedAt: endedAt || null,
      tags: parseList(formData.get("missionTags")),
      teaser: teaser || null,
      bodyMarkdown: "",
      bodyHtml: "",
      ownerUserId: user.id,
      isDraft: false,
    });
    await setMissionParticipants(createdMission.id, uniqueParticipantIds);
    missionId = createdMission.id;
    const missionPreview = synopsisExcerpt(teaser || title, 140);
    await notifyContentChange({
      contentType: "mission",
      event: "created",
      authorUserId: user.id,
      authorName: user.name,
      contentTypeLabel: "eine neue Mission",
      contentTitle: title,
      contentUrl: `${await getBaseUrl()}${missionHref(createdMission.slug)}`,
      preview: missionPreview,
      notifyPublic: false,
    });
    await notifyMissionParticipants(
      createdMission.slug,
      title,
      uniqueParticipantIds,
      missionPreview,
      user.id,
    );
    revalidatePath(`/chronologie/mission/${encodeURIComponent(createdMission.slug)}`);
    revalidatePath(`/gm/missions/${encodeURIComponent(createdMission.slug)}`);
  } else {
    const activeMissions = await listActiveSessionMissions();
    if (!activeMissions.some((mission) => mission.id === missionId)) {
      return { error: "Bitte eine laufende Mission auswählen." };
    }
  }

  const sessionId = await createPlannedSession({ ...parsed, missionId, notes: "", characterIds }, user.id);
  revalidateBoth();

  const created = await getPlannedSession(sessionId);

  const notified = await notifyPlannedSessionPlayers(
    { ...parsed, title: created?.title ?? "Spieltermin", characterIds },
    user.id,
  );
  return {
    success:
      notified > 0
        ? `Session geplant, ${notified} ${notified === 1 ? "Person" : "Personen"} benachrichtigt.`
        : "Session geplant.",
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
        // Angerissen statt vollständig: Die Notiz darf 2000 Zeichen lang sein
        // (parsePlannedSession) und ist roher Markdown — als Vorschau in der
        // Mail reicht der Anfang, wie bei jeder anderen Vorschau im Projekt.
        notes: synopsisExcerpt(session.notes, 200),
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
  const existing = await getPlannedSession(id);
  if (!existing) return { error: "Termin nicht gefunden." };
  if (existing.gameSessionId !== null && existing.missionId !== parsed.missionId) {
    return { error: "Die Mission einer bereits eingetragenen Session kann nicht geändert werden." };
  }
  if (existing.missionId !== parsed.missionId && !(await listActiveSessionMissions()).some((mission) => mission.id === parsed.missionId)) {
    return { error: "Bitte eine laufende Mission auswählen." };
  }

  const characterIds = await allowedCharacters(parsed.characterIds);
  if (characterIds === null) {
    return { error: "Mindestens eine ausgewählte Figur ist nicht (mehr) aktiv." };
  }

  await updatePlannedSession(id, { ...parsed, notes: existing.notes, characterIds });
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
