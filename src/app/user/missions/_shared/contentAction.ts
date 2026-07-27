"use server";
import { redirect } from "next/navigation";
import { userCan } from "@/lib/permissions";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  missionSlugExists,
  createMission,
  updateMissionContent,
  getMissionById,
  setMissionParticipants,
  getMissionParticipantUsers,
  notifyMissionSubscribers,
} from "@/lib/missions";
import { getParticipantCharactersForNotification } from "@/lib/characters";
import { getCharacterSubscribersForSlugs } from "@/lib/dialogues";
import { logCaughtError } from "@/lib/errorLog";
import { getUserSubscribersForSlugs, notifyContentChange } from "@/lib/follows";
import { slugifyBase } from "@/lib/slug";
import { revalidateMission } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import {
  sendMissionParticipantEmail,
  sendCharacterMissionParticipationEmail,
  sendUserMissionParticipationEmail,
} from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { parseList } from "@/lib/formParsing";

export interface MissionFormState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["active", "completed", "failed", "abandoned"] as const;

// Benachrichtigt Teilnehmer-Spieler + deren Charakter-/User-Abonnenten über
// eine neue Mission — identischer Ablauf, ob die Mission gerade frisch
// angelegt wird (Create-Branch, participantCharacterIds direkt aus dem
// Formular) oder gerade von Entwurf auf veröffentlicht wechselt (Edit-
// Branch, wasDraft && !isDraft): in beiden Fällen ist das der Moment, in dem
// die Mission für die Teilnehmenden überhaupt erstmals sichtbar wird — bei
// einem Entwurf konnte vorher niemand Teilnehmer-Benachrichtigungen
// bekommen haben, egal ob per Anlegen oder per späterer Veröffentlichung.
async function notifyMissionParticipants(
  missionSlug: string,
  missionTitle: string,
  participantCharacterIds: number[],
  preview: string,
  actingUserId: number,
): Promise<void> {
  if (participantCharacterIds.length === 0) return;

  const missionUrl = `${await getBaseUrl()}/missions/${missionSlug}`;
  const activateUrl = `${missionUrl}?activateFollow=1`;

  // Teilnehmer-Spieler informieren — die Mission wird dabei bewusst NICHT
  // automatisch abonniert (siehe mission_participants in schema.sql), die
  // Mail/Push enthält stattdessen einen separaten Link, der das Abo mit
  // einem Klick aktiviert (siehe missions/[missionSlug]/page.tsx,
  // ?activateFollow=1). Die anlegende/veröffentlichende Person wird
  // ausgeschlossen, falls sie selbst einen teilnehmenden Charakter spielt.
  const recipients = (
    await getMissionParticipantUsers(participantCharacterIds)
  ).filter((r) => r.id !== actingUserId);

  for (const recipient of recipients) {
    if (recipient.emailNotificationsEnabled) {
      const mailResult = await sendMissionParticipantEmail({
        to: recipient.email,
        name: recipient.name,
        missionTitle,
        missionUrl,
        activateUrl,
        preview,
      });
      if (!mailResult.sent) {
        const message = `Teilnehmer-Mail an ${recipient.email} fehlgeschlagen: ${mailResult.error}`;
        console.error(message);
        void logCaughtError(
          new Error(message),
          "user/missions/_shared/contentAction.ts:participantNotify",
        );
      }
    }
    if (recipient.pushNotificationsEnabled) {
      await sendPushToUser(recipient.id, {
        title: `Neue Mission: "${missionTitle}"`,
        body: preview,
        url: missionUrl,
      });
    }
  }

  // Zusätzlich zur direkten Spieler-Mail oben: wer einen teilnehmenden
  // Charakter ODER dessen Spieler abonniert hat, wird ebenfalls
  // benachrichtigt — der Spieler selbst wird dabei ausgeschlossen (der
  // bekommt bereits die direkte Mail oben), genau wie die anlegende/
  // veröffentlichende Person.
  const participantCharacters =
    await getParticipantCharactersForNotification(participantCharacterIds);

  // Subscriber für alle teilnehmenden Charaktere/Spieler in je einer Query
  // vorab laden (statt pro Charakter einzeln, N+1) — bei N Teilnehmern
  // sonst bis zu 2N sequentielle Anfragen in dieser einen Server Action.
  const playerSlugs = participantCharacters
    .map((c) => c.playerSlug)
    .filter((slug): slug is string => slug != null);
  const [characterSubscribersBySlug, userSubscribersBySlug] = await Promise.all([
    getCharacterSubscribersForSlugs(participantCharacters.map((c) => c.slug)),
    getUserSubscribersForSlugs(playerSlugs),
  ]);

  for (const character of participantCharacters) {
    const characterSubscribers = (
      characterSubscribersBySlug.get(character.slug) ?? []
    ).filter((s) => s.id !== actingUserId && s.id !== character.playerId);
    for (const subscriber of characterSubscribers) {
      if (subscriber.emailNotificationsEnabled) {
        const mailResult = await sendCharacterMissionParticipationEmail({
          to: subscriber.email,
          name: subscriber.name,
          characterName: character.name,
          missionTitle,
          missionUrl,
          preview,
        });
        if (!mailResult.sent) {
          const message = `Charakter-Abo-Mission-Mail an ${subscriber.email} fehlgeschlagen: ${mailResult.error}`;
          console.error(message);
          void logCaughtError(
            new Error(message),
            "user/missions/_shared/contentAction.ts:characterSubscriberNotify",
          );
        }
      }
      if (subscriber.pushNotificationsEnabled) {
        await sendPushToUser(subscriber.id, {
          title: `${character.name}: neue Mission`,
          body: preview,
          url: missionUrl,
        });
      }
    }

    if (character.playerId && character.playerSlug) {
      const userSubscribers = (
        userSubscribersBySlug.get(character.playerSlug) ?? []
      ).filter((s) => s.id !== actingUserId && s.id !== character.playerId);
      for (const subscriber of userSubscribers) {
        if (subscriber.emailNotificationsEnabled) {
          const mailResult = await sendUserMissionParticipationEmail({
            to: subscriber.email,
            name: subscriber.name,
            authorName: character.playerName ?? "",
            characterName: character.name,
            missionTitle,
            missionUrl,
            preview,
          });
          if (!mailResult.sent) {
            const message = `User-Abo-Mission-Mail an ${subscriber.email} fehlgeschlagen: ${mailResult.error}`;
            console.error(message);
            void logCaughtError(
              new Error(message),
              "user/missions/_shared/contentAction.ts:userSubscriberNotify",
            );
          }
        }
        if (subscriber.pushNotificationsEnabled) {
          await sendPushToUser(subscriber.id, {
            title: `${character.playerName}: neue Mission`,
            body: preview,
            url: missionUrl,
          });
        }
      }
    }
  }
}

// Vereint createMissionAction + updateMissionAction (vorher new/actions.ts +
// [missionId]/edit/actions.ts) zu einer Action für ContentEditor — Branch auf
// Vorhandensein von missionId statt zwei fast identischer Funktionen.
// deleteMissionAction bleibt separat in edit/actions.ts (eigener Zweck,
// nicht Teil von create/update).
export async function missionAction(
  _state: MissionFormState,
  formData: FormData,
): Promise<MissionFormState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }
  if (!userCan(user, "missions.manage")) {
    redirect("/user");
  }

  const missionIdRaw = formData.get("missionId");
  const isEdit = missionIdRaw != null && missionIdRaw !== "";
  const missionId = isEdit ? Number(missionIdRaw) : null;
  if (isEdit && !Number.isInteger(missionId)) {
    return { error: "Ungültige Mission." };
  }

  // Im Entwurf-Modus (siehe ContentEditor.tsx-Checkbox) ist nur der Text
  // optional — Titel & Co. bleiben Pflicht, siehe canViewDraft-Kommentar in
  // src/lib/visibility.ts für die Begründung.
  const isDraft = formData.get("isDraft") === "on";

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const status = String(formData.get("status") ?? "active");
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Ungültiger Status." };
  }

  const startedAtRaw = String(formData.get("startedAt") ?? "").trim();
  if (startedAtRaw && !DATE_RE.test(startedAtRaw)) {
    return { error: "Ungültiges Startdatum." };
  }
  const endedAtRaw = String(formData.get("endedAt") ?? "").trim();
  if (endedAtRaw && !DATE_RE.test(endedAtRaw)) {
    return { error: "Ungültiges Enddatum." };
  }

  const tags = parseList(formData.get("tags"));

  const teaser = String(formData.get("teaser") ?? "").trim() || null;

  const participantCharacterIds = formData
    .getAll("participantCharacterIds")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown && !isDraft) {
    return { error: "Bitte eine Zusammenfassung schreiben." };
  }

  const statusValue = status as (typeof VALID_STATUSES)[number];

  // Opt-in "Automatisch verlinken" — Selbstausschluss nur beim Bearbeiten
  // nötig (sonst könnte der Titel im eigenen Text auf sich selbst verlinken).
  let bodyHtml: string | undefined;
  if (bodyMarkdown && formData.get("autoLink") === "on") {
    const selfExclusion = isEdit ? await getMissionById(missionId!) : null;
    const linked = await autoLinkMarkdown(
      bodyMarkdown,
      selfExclusion ? { type: "mission", slug: selfExclusion.slug } : undefined,
    );
    bodyMarkdown = linked.sourceMd;
    bodyHtml = linked.html;
  }

  if (isEdit) {
    const result = await updateMissionContent(missionId!, {
      title,
      status: statusValue,
      startedAt: startedAtRaw || null,
      endedAt: endedAtRaw || null,
      tags,
      teaser,
      bodyMarkdown,
      isDraft,
      bodyHtml,
    });
    if (!result) {
      return { error: "Mission nicht gefunden." };
    }
    // Teilnehmerliste beim Bearbeiten aktualisieren, aber OHNE erneute
    // Teilnehmer-Benachrichtigung bei einer normalen Bearbeitung — die gibt
    // es laut Anforderung nur beim erstmaligen Anlegen bzw. beim
    // Veröffentlichen eines Entwurfs (s.u.), nicht bei jeder späteren
    // Änderung der Liste.
    await setMissionParticipants(missionId!, participantCharacterIds);
    revalidateMission(result.slug);

    const updatePreview = synopsisExcerpt(teaser ?? bodyMarkdown, 140);

    // Solange die Mission ein Entwurf bleibt, sieht sie außer GM/Admin
    // niemand — keine Benachrichtigung. Beim Veröffentlichen (wasDraft
    // true, isDraft jetzt false) gilt das wie ein Neuanlegen: "created"
    // statt "updated", plus die Teilnehmer-Benachrichtigung.
    if (!isDraft) {
      if (result.wasDraft) {
        await notifyContentChange({
          contentType: "mission",
          event: "created",
          authorUserId: session.userId,
          authorName: user.name,
          contentTypeLabel: "eine neue Mission",
          contentTitle: title,
          contentUrl: `${await getBaseUrl()}/missions/${result.slug}`,
          preview: updatePreview,
          notifyPublic: false,
        });
        await notifyMissionParticipants(
          result.slug,
          title,
          participantCharacterIds,
          updatePreview,
          session.userId,
        );
      } else {
        await notifyMissionSubscribers({
          missionSlug: result.slug,
          missionTitle: title,
          editingUserId: session.userId,
          preview: updatePreview,
        });
        await notifyContentChange({
          contentType: "mission",
          event: "updated",
          authorUserId: session.userId,
          authorName: user.name,
          contentTypeLabel: "eine Mission",
          contentTitle: title,
          contentUrl: `${await getBaseUrl()}/missions/${result.slug}`,
          preview: updatePreview,
          notifyPublic: false,
        });
      }
    }
    redirect("/user/content");
  }

  // Slug-Vergabe + Uniqueness-Check nur beim Anlegen — beim Bearbeiten ist
  // der Slug unveränderlich (kein Slug-Feld im Edit-Modus, siehe
  // missionHeadFields.ts showIf).
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugifyBase(slugInput || title);
  if (await missionSlugExists(slug)) {
    return {
      error: "Dieser Slug ist bereits vergeben — bitte einen anderen wählen.",
    };
  }

  const result = await createMission({
    slug,
    title,
    status: statusValue,
    startedAt: startedAtRaw || null,
    endedAt: endedAtRaw || null,
    tags,
    teaser,
    bodyMarkdown,
    isDraft,
    bodyHtml,
    ownerUserId: user.id,
  });
  revalidateMission(result.slug);

  if (participantCharacterIds.length > 0) {
    await setMissionParticipants(result.id, participantCharacterIds);
  }

  if (!isDraft) {
    const preview = synopsisExcerpt(teaser ?? bodyMarkdown, 140);
    await notifyContentChange({
      contentType: "mission",
      event: "created",
      authorUserId: session.userId,
      authorName: user.name,
      contentTypeLabel: "eine neue Mission",
      contentTitle: title,
      contentUrl: `${await getBaseUrl()}/missions/${result.slug}`,
      preview,
      notifyPublic: false,
    });
    await notifyMissionParticipants(
      result.slug,
      title,
      participantCharacterIds,
      preview,
      session.userId,
    );
  }

  redirect(`/missions/${result.slug}`);
}
