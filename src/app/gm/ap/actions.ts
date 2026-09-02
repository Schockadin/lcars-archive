"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  ADVANCEMENT_RULE_FIELDS,
  validateAdvancementRules,
} from "@/lib/advancement";
import {
  setAdvancementRules,
  resetAdvancementRules,
} from "@/lib/advancementSettings";

export interface RulesFormState {
  error?: string;
  success?: string;
}

// Regelwerk speichern. gm-oder-admin wie die übrigen Kampagnen-Werkzeuge; die
// Werte laufen durch dieselbe Prüfung, die auch das Formular anzeigt.
export async function saveRulesAction(
  state: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  await requireGM();

  const raw: Record<string, string> = {};
  for (const field of ADVANCEMENT_RULE_FIELDS) {
    raw[field.key] = String(formData.get(field.key) ?? "");
  }

  const parsed = validateAdvancementRules(raw);
  if (!parsed.ok) return { error: parsed.error };

  await setAdvancementRules(parsed.value);

  // Die Regeln bestimmen Kosten und Budgets auf jedem Charakterbogen.
  revalidatePath("/gm/ap");
  revalidatePath("/gm/sessions");
  revalidatePath("/user/characters", "layout");

  return { success: "Regelwerk gespeichert." };
}

// Zurück auf die eingebauten Standardwerte.
export async function resetRulesAction(
  // useActionState reicht den vorherigen State durch; hier wird er nicht
  // gebraucht (das Zurücksetzen hängt von keiner Eingabe ab).
  _state: RulesFormState,
): Promise<RulesFormState> {
  await requireGM();
  await resetAdvancementRules();

  revalidatePath("/gm/ap");
  revalidatePath("/gm/sessions");
  revalidatePath("/user/characters", "layout");

  return { success: "Regelwerk auf die Standardwerte zurückgesetzt." };
}
