"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGM } from "@/lib/dal";
import {
  createGameSession,
  deleteGameSession,
  updateGameSession,
  listActiveCharactersForAp,
  listCharactersForSessionEdit,
  listSessionMissions,
} from "@/lib/gameSessions";
import { validateGameSessionInput } from "@/lib/gameSessionFormat";
import { isIsoDate } from "@/lib/gameSessionFormat";
import { missionSlugExists } from "@/lib/missions";
import { slugifyBase } from "@/lib/slug";
import { revalidateMission } from "@/lib/revalidate";
import {
  getPlannedSession,
  linkPlannedSession,
} from "@/lib/plannedSessions";

export interface SessionFormState {
  error?: string;
  success?: string;
}

// Alle Actions sind gm-oder-admin (requireGM prüft das Recht frisch aus der
// DB). Die Eingaben laufen durch dieselbe Prüfung wie im Formular; verbindlich
// ist ausschließlich diese Seite.

export async function createSessionAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await requireGM();

  const parsed = validateGameSessionInput({
    sessionDate: String(formData.get("sessionDate") ?? ""),
    sessionAp: String(formData.get("sessionAp") ?? ""),
    bonusAp: String(formData.get("bonusAp") ?? ""),
    characterIds: formData.getAll("characterIds").map(String),
  });
  if (!parsed.ok) return { error: parsed.error };
  const sessionContext = await readSessionContext(formData);
  if ("error" in sessionContext) return { error: sessionContext.error };

  // Nur Charaktere gutschreiben, die auch wirklich gutschreibbar sind — ein
  // manipuliertes Formular soll keine fremde, zurückgezogene oder gelöschte
  // Akte auf ein AP-Konto heben.
  const allowed = new Set(
    (await listActiveCharactersForAp()).map((character) => character.id),
  );
  const characterIds = parsed.value.characterIds.filter((id) =>
    allowed.has(id),
  );
  if (characterIds.length !== parsed.value.characterIds.length) {
    return {
      error: "Mindestens ein ausgewählter Charakter ist nicht (mehr) aktiv.",
    };
  }

  await createGameSession({
    ...parsed.value,
    missionId: sessionContext.missionId!,
    newMission: sessionContext.newMission,
    synopsisBlocks: sessionContext.synopsisBlocks,
    characterIds,
    createdByUserId: user.id,
  });
  revalidateMission(sessionContext.missionSlug);

  revalidatePath("/gm/sessions");
  revalidatePath("/gm/ap");
  revalidatePath("/gm/campaign");

  const perCharacter = parsed.value.sessionAp + parsed.value.bonusAp;
  return {
    success:
      characterIds.length > 0 && perCharacter > 0
        ? `Session angelegt, je ${perCharacter} AP an ${characterIds.length} Charaktere gebucht.`
        : "Session angelegt.",
  };
}

// Zurücknehmen löscht auch die Gutschriften (ON DELETE CASCADE, siehe
// scripts/schema.sql) — bereits ausgegebene AP holt das nicht zurück, der
// Kontostand kann dadurch rechnerisch ins Minus laufen.
export async function deleteSessionAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültige Session." };

  const deleted = await deleteGameSession(id);
  if (deleted === null) return { error: "Session nicht gefunden." };
  if (deleted) {
    revalidateMission(deleted);
    revalidatePath(`/gm/missions/${encodeURIComponent(deleted)}`);
  }

  revalidatePath("/gm/sessions");
  revalidatePath(`/gm/sessions/${id}`);
  revalidatePath("/gm/ap");
  revalidatePath("/gm/campaign");
  revalidatePath("/");
  if (formData.get("returnToSessions") === "true") redirect("/gm/sessions");
  return {
    success: "Session zurückgenommen, die Gutschriften wurden storniert.",
  };
}

// Eine eingetragene Session korrigieren — Datum, Mission, AP-Beträge, Synopsisblöcke
// und Teilnehmende. Die Gutschriften werden dabei mitgezogen (siehe
// updateGameSession): eine Korrektur, die die Konten nicht mitnimmt, wäre
// keine.
export async function updateSessionAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Ungültige Session." };

  // Dieselbe Prüfung wie beim Anlegen — Titel-/Notizlängen, Datum, Beträge.
  const parsed = validateGameSessionInput({
    sessionDate: String(formData.get("sessionDate") ?? ""),
    sessionAp: String(formData.get("sessionAp") ?? ""),
    bonusAp: String(formData.get("bonusAp") ?? ""),
    characterIds: formData.getAll("characterIds").map(String),
  });
  if (!parsed.ok) return { error: parsed.error };
  const sessionContext = await readSessionContext(formData, false);
  if ("error" in sessionContext) return { error: sessionContext.error };

  // Bestehende Teilnehmende behalten ihre Gutschrift auch nach dem Ruhestand.
  const allowed = new Set(
    (await listCharactersForSessionEdit(id)).map((character) => character.id),
  );
  const characterIds = parsed.value.characterIds.filter((cid) =>
    allowed.has(cid),
  );
  if (characterIds.length !== parsed.value.characterIds.length) {
    return {
      error: "Mindestens ein ausgewählter Charakter ist nicht (mehr) aktiv.",
    };
  }

  const updated = await updateGameSession({
    id,
    ...parsed.value,
    missionId: sessionContext.missionId!,
    synopsisBlocks: sessionContext.synopsisBlocks,
    characterIds,
    actingUserId: user.id,
  });
  if (!updated) return { error: "Session nicht gefunden." };
  revalidateMission(updated.missionSlug);
  if (updated.oldMissionSlug) revalidateMission(updated.oldMissionSlug);
  revalidatePath(`/gm/missions/${encodeURIComponent(updated.missionSlug)}`);
  if (updated.oldMissionSlug) revalidatePath(`/gm/missions/${encodeURIComponent(updated.oldMissionSlug)}`);

  revalidatePath("/gm/sessions");
  revalidatePath(`/gm/sessions/${id}`);
  revalidatePath("/gm/ap");
  revalidatePath("/gm/campaign");
  return {
    success: "Session gespeichert — die Gutschriften wurden neu gebucht.",
  };
}

// Aus einem angekündigten Termin wird die gespielte Session: Datum, Mission und
// die eingeplanten Figuren stehen schon, im Fenster kommen AP-Beträge und Synopsisblöcke
// und die letzte Korrektur der Teilnehmerliste dazu.
//
// Danach zeigt der Termin auf die gebuchte Session (linkPlannedSession) und
// verschwindet von der Startseite — die Zusagen bleiben an ihm stehen. Wird
// die Session später zurückgenommen, steht der Termin wieder als offen da
// (ON DELETE SET NULL).
export async function recordPlannedSessionAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await requireGM();

  const plannedId = Number(formData.get("plannedId"));
  if (!Number.isInteger(plannedId) || plannedId <= 0) {
    return { error: "Unbekannter Termin." };
  }
  const planned = await getPlannedSession(plannedId);
  if (!planned) return { error: "Termin nicht gefunden." };
  if (planned.gameSessionId !== null) {
    return { error: "Dieser Termin ist bereits eingetragen." };
  }

  const parsed = validateGameSessionInput({
    sessionDate: String(formData.get("sessionDate") ?? ""),
    sessionAp: String(formData.get("sessionAp") ?? ""),
    bonusAp: String(formData.get("bonusAp") ?? ""),
    characterIds: formData.getAll("characterIds").map(String),
  });
  if (!parsed.ok) return { error: parsed.error };
  const sessionContext = await readSessionContext(formData);
  if ("error" in sessionContext) return { error: sessionContext.error };
  if (planned.missionId !== null && sessionContext.missionId !== planned.missionId) {
    return { error: "Die geplante Session muss ihrer zugehörigen Mission folgen." };
  }

  // Wie beim Anlegen von Hand: nur aktive, gutschreibbare Akten kommen aufs
  // Konto.
  const allowed = new Set(
    (await listActiveCharactersForAp()).map((character) => character.id),
  );
  const characterIds = parsed.value.characterIds.filter((id) =>
    allowed.has(id),
  );
  if (characterIds.length !== parsed.value.characterIds.length) {
    return {
      error: "Mindestens ein ausgewählter Charakter ist nicht (mehr) aktiv.",
    };
  }

  const sessionId = await createGameSession({
    ...parsed.value,
    missionId: planned.missionId ?? sessionContext.missionId,
    reservedMissionSessionNumber:
      planned.missionId !== null ? planned.missionSessionNumber ?? undefined : undefined,
    newMission: sessionContext.newMission,
    synopsisBlocks: sessionContext.synopsisBlocks,
    characterIds,
    createdByUserId: user.id,
  });
  revalidateMission(sessionContext.missionSlug);
  await linkPlannedSession(plannedId, sessionId);

  revalidatePath("/gm/sessions");
  revalidatePath("/gm/ap");
  revalidatePath("/gm/campaign");
  revalidatePath("/");

  const perCharacter = parsed.value.sessionAp + parsed.value.bonusAp;
  return {
    success:
      characterIds.length > 0 && perCharacter > 0
        ? `Termin eingetragen, je ${perCharacter} AP an ${characterIds.length} Charaktere gebucht.`
        : "Termin eingetragen.",
  };
}

async function readSessionContext(
  formData: FormData,
  allowNewMission = true,
): Promise<
  | {
      missionId?: number;
      missionSlug: string;
      newMission?: { slug: string; title: string; ownerUserId: number };
      synopsisBlocks: { ingameDate: string; body: string }[];
    }
  | { error: string }
> {
  const missionChoice = String(formData.get("missionChoice") ?? "");
  let missionId: number | undefined;
  let missionSlug: string;
  let newMission: { slug: string; title: string; ownerUserId: number } | undefined;
  if (missionChoice === "new" && allowNewMission) {
    const title = String(formData.get("newMissionTitle") ?? "").trim();
    const slug = slugifyBase(title);
    if (!title || title.length > 200 || !slug) {
      return { error: "Bitte einen gültigen Titel für die neue Mission angeben." };
    }
    if (await missionSlugExists(slug)) {
      return { error: "Eine Mission mit diesem Titel existiert bereits. Bitte den Titel anpassen." };
    }
    missionSlug = slug;
    newMission = { slug, title, ownerUserId: (await requireGM()).id };
  } else {
    const rawId = missionChoice.startsWith("mission:") ? missionChoice.slice(8) : "";
    missionId = Number(rawId);
    if (!Number.isInteger(missionId) || missionId <= 0) {
      return { error: "Bitte eine Mission auswählen." };
    }
    const mission = (await listSessionMissions()).find((item) => item.id === missionId);
    if (!mission) return { error: "Die ausgewählte Mission ist nicht verfügbar." };
    missionSlug = mission.slug;
  }

  const dates = formData.getAll("synopsisDate").map((value) => String(value).trim());
  const texts = formData.getAll("synopsisText").map((value) => String(value).trim());
  if (dates.length !== texts.length || dates.length > 20) {
    return { error: "Die Zusammenfassungsblöcke sind ungültig." };
  }
  const synopsisBlocks: { ingameDate: string; body: string }[] = [];
  for (let i = 0; i < dates.length; i++) {
    const [ingameDate, body] = [dates[i], texts[i]];
    if (!ingameDate && !body) continue;
    if (!isIsoDate(ingameDate)) return { error: `Bitte ein gültiges Ingame-Datum für Block ${i + 1} angeben.` };
    if (!body || body.length > 12_000) return { error: `Bitte Text für Block ${i + 1} angeben (maximal 12.000 Zeichen).` };
    synopsisBlocks.push({ ingameDate, body });
  }
  return { missionId, missionSlug, newMission, synopsisBlocks };
}
