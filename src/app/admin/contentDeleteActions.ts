"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { deleteCharacter, restoreCharacter } from "@/lib/characters";
import {
  deleteMission,
  restoreMission,
  deleteMissionLogAsAdmin,
  restoreMissionLog,
} from "@/lib/missions";
import { deleteArchiveEntry, restoreArchiveEntry } from "@/lib/archive";
import { deleteDialogue, restoreDialogue } from "@/lib/dialoguesCore";
import { purgeContentById } from "@/lib/purgeContent";
import {
  revalidateCharacter,
  revalidateMission,
  revalidateLog,
  revalidateArchiveEntry,
  revalidateTimeline,
} from "@/lib/revalidate";
import type { TrashContentType } from "@/lib/adminContent";

// Admin-only Weich-Löschen/Wiederherstellen über alle fünf Inhaltstypen
// hinweg (Charakter/Mission/Missionslog/Archiv-Eintrag/Dialog) — für den
// Löschen-Knopf in ActionsMenu.tsx sowie die Trash-Ansicht
// (/admin/content/trash). Gleiches contentType-Switch-Muster wie
// setOwnerAction (src/app/actions/owner.ts): eine Funktion pro Richtung,
// statt fünf fast identischer Dünnwrapper.
export async function deleteContentAction(
  contentType: TrashContentType,
  id: number,
): Promise<{ error?: string }> {
  const admin = await requirePermission("content.moderate");

  if (contentType === "character") {
    const result = await deleteCharacter(id, admin.id);
    if (!result) return { error: "Charakter nicht gefunden." };
    revalidateCharacter(result.slug);
  } else if (contentType === "mission") {
    const result = await deleteMission(id, admin.id);
    if (!result) return { error: "Mission nicht gefunden." };
    revalidateMission(result.slug);
    for (const logSlug of result.logSlugs) revalidateLog(id, logSlug);
  } else if (contentType === "mission_log") {
    const result = await deleteMissionLogAsAdmin(id, admin.id);
    if (!result) return { error: "Missionslog nicht gefunden." };
    revalidateLog(result.missionId, result.slug);
  } else if (contentType === "archive_entry") {
    const result = await deleteArchiveEntry(id, admin.id);
    if (!result) return { error: "Archiv-Eintrag nicht gefunden." };
    revalidateArchiveEntry(result.slug);
  } else {
    const result = await deleteDialogue(id, admin.id);
    if (!result) return { error: "Dialog nicht gefunden." };
    revalidateArchiveEntry(result.slug);
  }

  revalidateTimeline();
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/trash");
  return {};
}

// "Endgültig löschen"-Knopf in der Trash-Ansicht — sofortiges Purgen eines
// einzelnen, bereits weich gelöschten Eintrags, statt auf den 7-Tage-Cronjob
// (scripts/purge-soft-deleted.ts) zu warten. Keine revalidate*(slug)-Aufrufe
// nötig: der Inhalt war durch deleted_at bereits aus allen gecachten Listen
// verschwunden, nur die Trash-Ansicht selbst muss sich aktualisieren.
export async function purgeContentAction(
  contentType: TrashContentType,
  id: number,
): Promise<{ error?: string }> {
  await requirePermission("content.moderate");

  const purged = await purgeContentById(contentType, id);
  if (!purged) return { error: "Eintrag nicht gefunden oder nicht gelöscht." };

  revalidatePath("/admin/content/trash");
  return {};
}

export async function restoreContentAction(
  contentType: TrashContentType,
  id: number,
): Promise<{ error?: string }> {
  const moderator = await requirePermission("content.moderate");

  if (contentType === "character") {
    const result = await restoreCharacter(id);
    if (!result) return { error: "Charakter nicht gefunden." };
    revalidateCharacter(result.slug);
  } else if (contentType === "mission") {
    const result = await restoreMission(id);
    if (!result) return { error: "Mission nicht gefunden." };
    revalidateMission(result.slug);
  } else if (contentType === "mission_log") {
    const result = await restoreMissionLog(id, moderator.id);
    if (!result) return { error: "Missionslog nicht gefunden." };
    revalidateLog(result.missionId, result.slug);
  } else if (contentType === "archive_entry") {
    const result = await restoreArchiveEntry(id);
    if (!result) return { error: "Archiv-Eintrag nicht gefunden." };
    revalidateArchiveEntry(result.slug);
  } else {
    const result = await restoreDialogue(id);
    if (!result) return { error: "Dialog nicht gefunden." };
    revalidateArchiveEntry(result.slug);
  }

  revalidateTimeline();
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/trash");
  return {};
}
