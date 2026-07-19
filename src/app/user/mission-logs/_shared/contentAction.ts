"use server";
import { redirect } from "next/navigation";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import {
  getAllMissions,
  missionLogSlugExists,
  createMissionLog,
  updateMissionLogContent,
} from "@/lib/missions";
import { revalidateLog } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import { getCharacterSubscribers } from "@/lib/dialogues";
import { sendNewMissionLogEmail } from "@/lib/mail";
import { logCaughtError } from "@/lib/errorLog";
import { sendPushToUser } from "@/lib/push";
import { notifyContentChange } from "@/lib/follows";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { parseList } from "@/lib/formParsing";

export interface MissionLogFormState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Vereint createMissionLogAction + updateMissionLogAction (vorher
// new/actions.ts + [logId]/edit/actions.ts) zu einer Action für
// ContentEditor — Branch auf Vorhandensein von logId. Größte Asymmetrie
// unter den 4 Content-Typen: Autor/Mission/Session-Nr/Slug existieren nur
// beim Anlegen — nach dem Anlegen sind sie unveränderlich (siehe
// updateMissionLogContent in src/lib/missions.ts, das nur title/logDate/
// bodyMarkdown kennt).
export async function missionLogAction(
  _state: MissionLogFormState,
  formData: FormData,
): Promise<MissionLogFormState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const logIdRaw = formData.get("logId");
  const isEdit = logIdRaw != null && logIdRaw !== "";
  const logId = isEdit ? Number(logIdRaw) : null;
  if (isEdit && !Number.isInteger(logId)) {
    return { error: "Ungültiges Log." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const logDateRaw = String(formData.get("logDate") ?? "").trim();
  if (logDateRaw && !DATE_RE.test(logDateRaw)) {
    return { error: "Ungültiges Datum." };
  }
  const logDate = logDateRaw || null;

  const tags = parseList(formData.get("tags"));

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Log-Text schreiben." };

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — kein
  // Selbst-Ausschluss nötig, Mission-Logs sind selbst kein Autolinking-Ziel
  // (siehe getAutolinkTargets in src/lib/autolink.ts).
  let contentHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
    const linked = await autoLinkMarkdown(bodyMarkdown);
    bodyMarkdown = linked.sourceMd;
    contentHtml = linked.html;
  }

  if (isEdit) {
    const result = await updateMissionLogContent(session.userId, logId!, {
      title,
      logDate,
      tags,
      bodyMarkdown,
      contentHtml,
    });
    if (!result) {
      return { error: "Log nicht gefunden oder keine Berechtigung." };
    }
    revalidateLog(result.missionId, result.slug);

    const contentUrl = `${await getBaseUrl()}/missions/${result.missionSlug}/${result.slug}`;
    const preview = synopsisExcerpt(bodyMarkdown, 140);
    const author = await getUserById(session.userId);

    await notifyContentChange({
      contentType: "mission_log",
      event: "updated",
      authorUserId: session.userId,
      authorName: author?.name ?? "Unbekannt",
      contentTypeLabel: "einen Mission-Log",
      contentTitle: title,
      contentUrl,
      preview,
      notifyPublic: result.visibility === "public",
    });
    redirect("/user/content");
  }

  // Autor/Mission/Session-Nr/Slug nur beim Anlegen — im Edit-Modus fehlen
  // diese Felder im Formular (siehe missionLogHeadFields.ts showIf +
  // extraHeadSlot in NewMissionLogForm.tsx).
  const authorCharacterId = Number(formData.get("authorCharacterId"));
  if (!Number.isInteger(authorCharacterId)) {
    return { error: "Bitte einen Charakter auswählen." };
  }

  // Nie den <select>-Werten aus dem Client blind vertrauen — wie
  // createDialogueAction in ../dialogues/new/actions.ts.
  const ownCharacters = await getCharactersForUser(session.userId);
  const authorCharacter = ownCharacters.find((c) => c.id === authorCharacterId);
  if (!authorCharacter) {
    return { error: "Ungültiger Charakter." };
  }

  const missionSlug = String(formData.get("missionSlug") ?? "").trim();
  const missions = await getAllMissions();
  const mission = missions.find((m) => m.slug === missionSlug);
  if (!mission) {
    return { error: "Ungültige Mission." };
  }

  const sessionNr = Number(formData.get("sessionNr"));
  if (!Number.isInteger(sessionNr) || sessionNr < 1) {
    return { error: "Ungültige Session-Nummer." };
  }

  const slug = `${authorCharacter.slug}-${mission.slug}-${sessionNr}`;
  if (await missionLogSlugExists(slug)) {
    return {
      error:
        "Diese Session-Nummer ist für diesen Charakter und diese Mission bereits vergeben.",
    };
  }

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  const result = await createMissionLog({
    slug,
    missionId: mission.id,
    authorId: authorCharacter.id,
    title,
    bodyMarkdown,
    contentHtml,
    logDate,
    sessionNr,
    tags,
    ownerUserId: user.id,
  });

  revalidateLog(mission.id, result.slug);

  // Wer den Autor-Charakter abonniert hat, bekommt eine Mail/Push zum neuen
  // Log — ein einzelnes, sofortiges Ereignis wie bei Dialog-Nachrichten,
  // kein Sammel-Digest. Der Verfasser selbst ist logischerweise nie
  // Abonnent seines eigenen Charakters relevant für diese Benachrichtigung,
  // aber getCharacterSubscribers filtert ohnehin nicht danach — ein
  // Ausschluss ist trotzdem unnötig, da niemand sich selbst für Push/Mail
  // über die eigene Aktion in dieser Liste wiederfinden würde, außer er
  // hätte explizit den eigenen Charakter abonniert, was ein bewusster Fall
  // ist (er wollte offenbar benachrichtigt werden).
  const subscribers = await getCharacterSubscribers(authorCharacter.slug);
  if (subscribers.length > 0) {
    const logUrl = `${await getBaseUrl()}/missions/${mission.slug}/${result.slug}`;
    const preview = synopsisExcerpt(bodyMarkdown, 140);
    for (const subscriber of subscribers) {
      if (subscriber.emailNotificationsEnabled) {
        const mailResult = await sendNewMissionLogEmail({
          to: subscriber.email,
          name: subscriber.name,
          characterName: authorCharacter.name,
          missionTitle: mission.title,
          logTitle: title,
          logUrl,
          preview,
        });
        if (!mailResult.sent) {
          console.error(
            `Neuer-Log-Mail an ${subscriber.email} fehlgeschlagen: ${mailResult.error}`,
          );
          await logCaughtError(
            new Error(mailResult.error),
            "user/mission-logs/_shared/contentAction.ts:subscriberNotify",
          );
        }
      }
      if (subscriber.pushNotificationsEnabled) {
        await sendPushToUser(subscriber.id, {
          title: `Neuer Log von ${authorCharacter.name}`,
          body: preview,
          url: logUrl,
        });
      }
    }
  }

  // Mission-Logs sind standardmäßig public (siehe scripts/schema.sql) — ein
  // neu angelegter Log benachrichtigt die Abonnenten des Erstellers (nicht
  // des Autor-Charakters, siehe getCharacterSubscribers oben) deshalb
  // ungegated.
  await notifyContentChange({
    contentType: "mission_log",
    event: "created",
    authorUserId: session.userId,
    authorName: user.name,
    contentTypeLabel: "einen neuen Mission-Log",
    contentTitle: title,
    contentUrl: `${await getBaseUrl()}/missions/${mission.slug}/${result.slug}`,
    preview: synopsisExcerpt(bodyMarkdown, 140),
    notifyPublic: true,
  });

  redirect("/user");
}
