"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  createCampaignRule,
  updateCampaignRule,
  deleteCampaignRule,
  RuleNameTakenError,
} from "@/lib/campaignRules";
import { validateCampaignRuleInput } from "@/lib/campaignRuleTypes";

export interface RuleFormState {
  error?: string;
  success?: string;
}

function readInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    body: String(formData.get("body") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? ""),
  };
}

// Alle drei Actions sind gm-oder-admin (requireGM prüft das Recht frisch aus
// der DB). Die Eingaben laufen durch dieselbe Prüfung wie im Formular
// (validateCampaignRuleInput) — das Formular zeigt sie nur an, verbindlich
// ist hier. Aufgebaut wie src/app/gm/focuses/actions.ts.

export async function createRuleAction(
  state: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const user = await requireGM();

  const parsed = validateCampaignRuleInput(readInput(formData));
  if (!parsed.ok) return { error: parsed.error };

  try {
    await createCampaignRule(parsed.value, user.id);
  } catch (err) {
    if (err instanceof RuleNameTakenError) {
      return { error: `„${parsed.value.name}“ gibt es bereits.` };
    }
    throw err;
  }

  revalidatePath("/gm/rules");
  return { success: `„${parsed.value.name}“ angelegt.` };
}

export async function updateRuleAction(
  state: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültige Regel." };

  const parsed = validateCampaignRuleInput(readInput(formData));
  if (!parsed.ok) return { error: parsed.error };

  try {
    const updated = await updateCampaignRule(id, parsed.value);
    if (!updated) return { error: "Regel nicht gefunden." };
  } catch (err) {
    if (err instanceof RuleNameTakenError) {
      return { error: `„${parsed.value.name}“ gibt es bereits.` };
    }
    throw err;
  }

  revalidatePath("/gm/rules");
  return { success: `„${parsed.value.name}“ gespeichert.` };
}

// Anders als bei Talenten und Schwerpunkten ist jede Regel löschbar — sie
// steht auf keinem Bogen als Eintrag, sondern erscheint auf allen
// Spickzetteln gleich (siehe deleteCampaignRule).
export async function deleteRuleAction(
  state: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültige Regel." };

  const deleted = await deleteCampaignRule(id);
  if (!deleted) return { error: "Regel nicht gefunden." };

  revalidatePath("/gm/rules");
  return { success: "Regel gelöscht." };
}
