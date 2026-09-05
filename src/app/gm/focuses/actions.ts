"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  createFocus,
  updateFocus,
  deleteCustomFocus,
  FocusNameTakenError,
} from "@/lib/focuses";
import { validateFocusInput } from "@/lib/focusCatalog";

export interface FocusFormState {
  error?: string;
  success?: string;
}

function readInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    discipline: String(formData.get("discipline") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

// Alle drei Actions sind gm-oder-admin (requireGM prüft das Recht frisch aus
// der DB). Die Eingaben laufen durch dieselbe Prüfung wie im Formular
// (validateFocusInput) — das Formular zeigt sie nur an, verbindlich ist hier.
// Aufgebaut wie src/app/gm/talents/actions.ts.

export async function createFocusAction(
  state: FocusFormState,
  formData: FormData,
): Promise<FocusFormState> {
  const user = await requireGM();

  const parsed = validateFocusInput(readInput(formData));
  if (!parsed.ok) return { error: parsed.error };

  try {
    await createFocus(parsed.value, user.id);
  } catch (err) {
    if (err instanceof FocusNameTakenError) {
      return {
        error: `„${parsed.value.name}“ gibt es in dieser Disziplin bereits.`,
      };
    }
    throw err;
  }

  revalidatePath("/gm/focuses");
  return { success: `„${parsed.value.name}“ angelegt.` };
}

export async function updateFocusAction(
  state: FocusFormState,
  formData: FormData,
): Promise<FocusFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültiger Schwerpunkt." };

  const parsed = validateFocusInput(readInput(formData));
  if (!parsed.ok) return { error: parsed.error };

  try {
    const updated = await updateFocus(id, parsed.value);
    if (!updated) return { error: "Schwerpunkt nicht gefunden." };
  } catch (err) {
    if (err instanceof FocusNameTakenError) {
      return {
        error: `„${parsed.value.name}“ gibt es in dieser Disziplin bereits.`,
      };
    }
    throw err;
  }

  revalidatePath("/gm/focuses");
  return { success: `„${parsed.value.name}“ gespeichert.` };
}

// Nur selbst ergänzte Schwerpunkte lassen sich löschen (siehe
// deleteCustomFocus): einen importierten zu entfernen, würde Charakterbögen
// entwerten, auf denen er bereits steht.
export async function deleteFocusAction(
  state: FocusFormState,
  formData: FormData,
): Promise<FocusFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültiger Schwerpunkt." };

  const deleted = await deleteCustomFocus(id);
  if (!deleted) {
    return {
      error:
        "Nur selbst ergänzte Schwerpunkte lassen sich löschen — importierte stehen möglicherweise schon auf Charakterbögen.",
    };
  }

  revalidatePath("/gm/focuses");
  return { success: "Schwerpunkt gelöscht." };
}
