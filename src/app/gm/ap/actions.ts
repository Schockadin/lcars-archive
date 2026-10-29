"use server";
import { revalidatePathAndNotify } from "@/lib/realtimeServer";
import { requireGM } from "@/lib/dal";
import {
  ADVANCEMENT_RULE_FIELDS,
  validateAdvancementRules,
} from "@/lib/advancement";
import {
  setAdvancementRules,
  resetAdvancementRules,
} from "@/lib/advancementSettings";
import {
  TECHNOMAGE_SPELL_SLOT_RULE_FIELDS,
  validateTechnomageSpellSlotRules,
} from "@/lib/technomageSpellSlotRules";
import {
  resetTechnomageSpellSlotRules,
  setTechnomageSpellSlotRules,
} from "@/lib/technomageSpellSlotSettings";

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
  await revalidatePathAndNotify("/gm/ap");
  await revalidatePathAndNotify("/gm/campaign");
  await revalidatePathAndNotify("/gm/sessions");
  await revalidatePathAndNotify("/user/characters", "layout");

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

  await revalidatePathAndNotify("/gm/ap");
  await revalidatePathAndNotify("/gm/campaign");
  await revalidatePathAndNotify("/gm/sessions");
  await revalidatePathAndNotify("/user/characters", "layout");

  return { success: "Regelwerk auf die Standardwerte zurückgesetzt." };
}

export async function saveTechnomageSpellSlotRulesAction(
  _state: RulesFormState,
  formData: FormData,
): Promise<RulesFormState> {
  await requireGM();

  const raw: Record<string, string> = {};
  for (const field of TECHNOMAGE_SPELL_SLOT_RULE_FIELDS) {
    raw[field.key] = String(formData.get(field.key) ?? "");
  }
  const parsed = validateTechnomageSpellSlotRules(raw);
  if (!parsed.ok) return { error: parsed.error };

  await setTechnomageSpellSlotRules(parsed.value);
  await revalidatePathAndNotify("/gm/ap");
  await revalidatePathAndNotify("/user/characters", "layout");
  await revalidatePathAndNotify("/characters", "layout");

  return { success: "Technomage-Slotregeln gespeichert." };
}

export async function resetTechnomageSpellSlotRulesAction(
  _state: RulesFormState,
): Promise<RulesFormState> {
  await requireGM();
  await resetTechnomageSpellSlotRules();

  await revalidatePathAndNotify("/gm/ap");
  await revalidatePathAndNotify("/user/characters", "layout");
  await revalidatePathAndNotify("/characters", "layout");

  return { success: "Technomage-Slotregeln auf Standardwerte zurückgesetzt." };
}
