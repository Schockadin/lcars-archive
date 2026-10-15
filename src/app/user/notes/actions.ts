"use server";

import { revalidatePath } from "next/cache";
import { requireOwnUser } from "@/app/user/dal";
import {
  addUserNote,
  deleteNote,
  listNotesForUser,
  listNoteTargetsForUser,
  updateNote,
} from "@/lib/contentNotes";
import { isNoteContentType, isNoteVisibility } from "@/lib/contentNoteTypes";
import { getRoleMap } from "@/lib/roles";
import { resolveViewer } from "@/lib/visibility";

async function ownViewer() {
  const user = await requireOwnUser();
  return resolveViewer(user, await getRoleMap());
}

export async function getMyNotesAction() {
  return listNotesForUser(await ownViewer());
}

export async function getNoteTargetsAction() {
  return listNoteTargetsForUser(await ownViewer());
}

export async function createMyNoteAction(input: {
  body: string;
  visibility: string;
  targetType: string | null;
  targetSlug: string | null;
}): Promise<{ error?: string }> {
  const viewer = await ownViewer();
  if (!input.body.trim()) return { error: "Die Notiz ist leer." };
  if (!isNoteVisibility(input.visibility))
    return { error: "Ungültige Sichtbarkeit." };
  let target: {
    type: "character" | "mission" | "mission_log" | "archive";
    slug: string;
  } | null = null;
  if (input.targetType !== null || input.targetSlug !== null) {
    if (
      !input.targetType ||
      !isNoteContentType(input.targetType) ||
      input.targetType === "standalone" ||
      !input.targetSlug
    ) {
      return { error: "Ungültiger Eintrag." };
    }
    target = { type: input.targetType, slug: input.targetSlug };
  }
  try {
    await addUserNote(viewer, input.body, input.visibility, target);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Der Eintrag ist nicht verfügbar."
    ) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/user/notes");
  return {};
}

export async function editMyNoteAction(
  id: number,
  body: string,
): Promise<{ error?: string }> {
  const viewer = await ownViewer();
  if (!Number.isInteger(id) || id <= 0) return { error: "Ungültige Notiz." };
  if (!body.trim()) return { error: "Die Notiz ist leer." };
  const note = (await listNotesForUser(viewer)).find((item) => item.id === id);
  if (!note?.canEdit)
    return { error: "Notiz nicht gefunden oder keine Berechtigung." };
  if (!(await updateNote(id, viewer, body)))
    return { error: "Notiz nicht gefunden oder keine Berechtigung." };
  revalidatePath("/user/notes");
  return {};
}

export async function deleteMyNoteAction(
  id: number,
): Promise<{ error?: string }> {
  const viewer = await ownViewer();
  if (!Number.isInteger(id) || id <= 0) return { error: "Ungültige Notiz." };
  const note = (await listNotesForUser(viewer)).find((item) => item.id === id);
  if (!note?.canEdit)
    return { error: "Notiz nicht gefunden oder keine Berechtigung." };
  if (!(await deleteNote(id, viewer)))
    return { error: "Notiz nicht gefunden oder keine Berechtigung." };
  revalidatePath("/user/notes");
  return {};
}
