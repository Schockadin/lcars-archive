"use server";
import { revalidatePath } from "next/cache";
import { requireGM, requireNonGuest } from "@/lib/dal";
import {
  createPlannedSession,
  deletePlannedSession,
  setRsvp,
  updatePlannedSession,
} from "@/lib/plannedSessions";
import { parsePlannedSession } from "@/lib/plannedSessionFormat";

export interface PlannedSessionState {
  error?: string;
  success?: string;
}

// Termine pflegt die Spielleitung (requireGM prüft das Recht frisch aus der
// DB); zu- und absagen darf jede angemeldete Person außer Gästen.
//
// Nach jeder Änderung beide Seiten neu bauen: die Verwaltung unter
// /gm/sessions und das Dashboard, auf dem der Termin steht.
function revalidateBoth(): void {
  revalidatePath("/gm/sessions");
  revalidatePath("/");
}

function formFields(formData: FormData) {
  return {
    date: String(formData.get("date") ?? ""),
    time: String(formData.get("time") ?? ""),
    title: String(formData.get("title") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export async function createPlannedSessionAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  const user = await requireGM();
  const parsed = parsePlannedSession(formFields(formData));
  if (!parsed.ok) return { error: parsed.error };

  await createPlannedSession(parsed, user.id);
  revalidateBoth();
  return { success: "Termin angekündigt." };
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

  await updatePlannedSession(id, parsed);
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

export async function setRsvpAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  const user = await requireNonGuest();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Unbekannter Termin." };

  const response = String(formData.get("response") ?? "");
  if (response !== "yes" && response !== "no") {
    return { error: "Bitte zu- oder absagen." };
  }
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);

  await setRsvp(id, user.id, response, note);
  revalidateBoth();
  return { success: response === "yes" ? "Zugesagt." : "Abgesagt." };
}
