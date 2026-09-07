"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/visibility";
import {
  addNote,
  deleteNote,
  isNoteContentType,
  isNoteVisibility,
  type NoteContentType,
} from "@/lib/contentNotes";

export interface NoteActionState {
  error?: string;
  success?: boolean;
}

// Alle drei Actions gaten selbst über getViewer() — die Notiz-UI wird zwar nur
// für eingeloggte Personen gerendert, aber eine Server Action ist ein
// öffentlicher Endpunkt und darf sich nicht darauf verlassen.

function targetFrom(formData: FormData):
  | { type: NoteContentType; slug: string; path: string }
  | null {
  const type = String(formData.get("contentType") ?? "");
  const slug = String(formData.get("contentSlug") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!isNoteContentType(type) || !slug) return null;
  return { type, slug, path };
}

export async function addNoteAction(
  _state: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Nur für angemeldete Personen." };

  const target = targetFrom(formData);
  if (!target) return { error: "Unbekannter Inhalt." };

  const body = String(formData.get("body") ?? "");
  if (!body.trim()) return { error: "Die Notiz ist leer." };

  const rawVisibility = String(formData.get("visibility") ?? "private");
  const visibility = isNoteVisibility(rawVisibility) ? rawVisibility : "private";

  await addNote(target.type, target.slug, viewer, body, visibility);
  if (target.path) revalidatePath(target.path);
  return { success: true };
}

export async function deleteNoteAction(
  _state: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Nur für angemeldete Personen." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Unbekannte Notiz." };

  await deleteNote(id, viewer);
  const path = String(formData.get("path") ?? "");
  if (path) revalidatePath(path);
  return { success: true };
}
