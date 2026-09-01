"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  createTalent,
  updateTalent,
  deleteCustomTalent,
  TalentNameTakenError,
} from "@/lib/talents";
import { validateTalentInput } from "@/lib/talentCatalog";

export interface TalentFormState {
  error?: string;
  success?: string;
}

function readInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    requirement: String(formData.get("requirement") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

// Alle drei Actions sind gm-oder-admin (requireGM prüft das Recht frisch aus
// der DB). Die Eingaben laufen durch dieselbe Prüfung wie im Formular
// (validateTalentInput) — das Formular zeigt sie nur an, verbindlich ist hier.

export async function createTalentAction(
  state: TalentFormState,
  formData: FormData,
): Promise<TalentFormState> {
  const user = await requireGM();

  const parsed = validateTalentInput(readInput(formData));
  if (!parsed.ok) return { error: parsed.error };

  try {
    await createTalent(parsed.value, user.id);
  } catch (err) {
    if (err instanceof TalentNameTakenError) {
      return { error: `„${parsed.value.name}“ gibt es bereits.` };
    }
    throw err;
  }

  revalidatePath("/gm/talents");
  return { success: `„${parsed.value.name}“ angelegt.` };
}

export async function updateTalentAction(
  state: TalentFormState,
  formData: FormData,
): Promise<TalentFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültiges Talent." };

  const parsed = validateTalentInput(readInput(formData));
  if (!parsed.ok) return { error: parsed.error };

  try {
    const updated = await updateTalent(id, parsed.value);
    if (!updated) return { error: "Talent nicht gefunden." };
  } catch (err) {
    if (err instanceof TalentNameTakenError) {
      return { error: `„${parsed.value.name}“ gibt es bereits.` };
    }
    throw err;
  }

  revalidatePath("/gm/talents");
  return { success: `„${parsed.value.name}“ gespeichert.` };
}

// Nur selbst ergänzte Talente lassen sich löschen (siehe deleteCustomTalent):
// ein importiertes Talent zu entfernen, würde Charakterbögen entwerten, auf
// denen es bereits steht.
export async function deleteTalentAction(
  state: TalentFormState,
  formData: FormData,
): Promise<TalentFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültiges Talent." };

  const deleted = await deleteCustomTalent(id);
  if (!deleted) {
    return {
      error:
        "Nur selbst ergänzte Talente lassen sich löschen — importierte stehen möglicherweise schon auf Charakterbögen.",
    };
  }

  revalidatePath("/gm/talents");
  return { success: "Talent gelöscht." };
}
