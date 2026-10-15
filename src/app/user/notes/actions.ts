"use server";

import { revalidatePath } from "next/cache";
import { requireOwnUser } from "@/app/user/dal";
import { deleteNote, listNotesForUser, updateNote } from "@/lib/contentNotes";
import { getRoleMap } from "@/lib/roles";
import { resolveViewer } from "@/lib/visibility";

async function ownViewer() {
  const user = await requireOwnUser();
  return resolveViewer(user, await getRoleMap());
}

export async function getMyNotesAction() {
  return listNotesForUser(await ownViewer());
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
