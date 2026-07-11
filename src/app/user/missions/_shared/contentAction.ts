"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  missionSlugExists,
  createMission,
  updateMissionContent,
  getMissionById,
  setMissionParticipants,
  getMissionParticipantUsers,
} from "@/lib/missions";
import { getParticipantCharactersForNotification } from "@/lib/characters";
import { getCharacterSubscribers } from "@/lib/dialogues";
import { getUserSubscribers } from "@/lib/follows";
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

export interface MissionFormState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["active", "completed", "failed", "abandoned"] as const;

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

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect("/user");
  }

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "gm" && user.role !== "admin") {
    redirect("/user");
  }

  const missionIdRaw = formData.get("missionId");
  const isEdit = missionIdRaw != null && missionIdRaw !== "";
  const missionId = isEdit ? Number(missionIdRaw) : null;
  if (isEdit && !Number.isInteger(missionId)) {
    return { error: "Ungültige Mission." };
  }

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

  const tags = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];

  const teaser = String(formData.get("teaser") ?? "").trim() || null;

  const participantCharacterIds = formData
    .getAll("participantCharacterIds")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine Zusammenfassung schreiben." };

  const statusValue = status as (typeof VALID_STATUSES)[number];

  // Opt-in "Automatisch verlinken" — Selbstausschluss nur beim Bearbeiten
  // nötig (sonst könnte der Titel im eigenen Text auf sich selbst verlinken).
  let bodyHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
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
      bodyHtml,
    });
    if (!result) {
      return { error: "Mission nicht gefunden." };
    }
    // Teilnehmerliste beim Bearbeiten aktualisieren, aber OHNE erneute
    // Teilnehmer-Benachrichtigung — die gibt es laut Anforderung nur beim
    // erstmaligen Anlegen (s.u.), nicht bei jeder späteren Änderung der
    // Liste.
    await setMissionParticipants(missionId!, participantCharacterIds);
    revalidateMission(result.slug);
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
    bodyHtml,
    ownerUserId: user.id,
  });
  revalidateMission(result.slug);

  if (participantCharacterIds.length > 0) {
    await setMissionParticipants(result.id, participantCharacterIds);

    const missionUrl = `${await getBaseUrl()}/missions/${result.slug}`;
    const activateUrl = `${missionUrl}?activateFollow=1`;
    const preview = synopsisExcerpt(teaser ?? bodyMarkdown, 140);

    // Teilnehmer-Spieler informieren — die Mission wird dabei bewusst NICHT
    // automatisch abonniert (siehe mission_participants in schema.sql), die
    // Mail/Push enthält stattdessen einen separaten Link, der das Abo mit
    // einem Klick aktiviert (siehe missions/[missionSlug]/page.tsx,
    // ?activateFollow=1). Der anlegende GM/Admin wird ausgeschlossen, falls
    // er selbst einen teilnehmenden Charakter spielt.
    const recipients = (
      await getMissionParticipantUsers(participantCharacterIds)
    ).filter((r) => r.id !== session.userId);

    for (const recipient of recipients) {
      if (recipient.emailNotificationsEnabled) {
        const mailResult = await sendMissionParticipantEmail({
          to: recipient.email,
          name: recipient.name,
          missionTitle: title,
          missionUrl,
          activateUrl,
          preview,
        });
        if (!mailResult.sent) {
          console.error(
            `Teilnehmer-Mail an ${recipient.email} fehlgeschlagen: ${mailResult.error}`,
          );
        }
      }
      if (recipient.pushNotificationsEnabled) {
        await sendPushToUser(recipient.id, {
          title: `Neue Mission: "${title}"`,
          body: preview,
          url: missionUrl,
        });
      }
    }

    // Zusätzlich zur direkten Spieler-Mail oben: wer einen teilnehmenden
    // Charakter ODER dessen Spieler abonniert hat, wird ebenfalls
    // benachrichtigt — der Spieler selbst wird dabei ausgeschlossen (der
    // bekommt bereits die direkte Mail oben), genau wie der anlegende
    // GM/Admin.
    const participantCharacters =
      await getParticipantCharactersForNotification(participantCharacterIds);

    for (const character of participantCharacters) {
      const characterSubscribers = (
        await getCharacterSubscribers(character.slug)
      ).filter(
        (s) => s.id !== session.userId && s.id !== character.playerId,
      );
      for (const subscriber of characterSubscribers) {
        if (subscriber.emailNotificationsEnabled) {
          const mailResult = await sendCharacterMissionParticipationEmail({
            to: subscriber.email,
            name: subscriber.name,
            characterName: character.name,
            missionTitle: title,
            missionUrl,
            preview,
          });
          if (!mailResult.sent) {
            console.error(
              `Charakter-Abo-Mission-Mail an ${subscriber.email} fehlgeschlagen: ${mailResult.error}`,
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
          await getUserSubscribers(character.playerSlug)
        ).filter(
          (s) => s.id !== session.userId && s.id !== character.playerId,
        );
        for (const subscriber of userSubscribers) {
          if (subscriber.emailNotificationsEnabled) {
            const mailResult = await sendUserMissionParticipationEmail({
              to: subscriber.email,
              name: subscriber.name,
              authorName: character.playerName ?? "",
              characterName: character.name,
              missionTitle: title,
              missionUrl,
              preview,
            });
            if (!mailResult.sent) {
              console.error(
                `User-Abo-Mission-Mail an ${subscriber.email} fehlgeschlagen: ${mailResult.error}`,
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

  redirect(`/missions/${result.slug}`);
}
