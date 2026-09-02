"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import { revalidateMission } from "@/lib/revalidate";
import {
  completeMissionWithAp,
  listActiveCharactersForAp,
} from "@/lib/gameSessions";

export interface MissionApState {
  error?: string;
  success?: string;
}

// AP für einen Missionsabschluss gibt es ausschließlich über diese Action: die
// Mission wird dabei zwingend ausgewählt und auf „abgeschlossen" gesetzt. Die
// freie Buchung kennt den Grund „Mission" deshalb nicht mehr (siehe
// apActions.ts).
export async function completeMissionAction(
  state: MissionApState,
  formData: FormData,
): Promise<MissionApState> {
  const user = await requireGM();

  const missionId = Number(formData.get("missionId"));
  if (!Number.isInteger(missionId) || missionId <= 0) {
    return { error: "Bitte eine Mission auswählen." };
  }

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  if (!Number.isInteger(amount) || amount < 0 || amount > 999) {
    return { error: "AP müssen eine ganze Zahl zwischen 0 und 999 sein." };
  }

  const note = String(formData.get("note") ?? "").trim() || null;

  // Wie bei den Sessions: gutgeschrieben wird nur, wer auch gutschreibbar ist —
  // ein manipuliertes Formular soll keine fremde, zurückgezogene oder gelöschte
  // Akte auf ein AP-Konto heben.
  const allowed = new Set(
    (await listActiveCharactersForAp()).map((character) => character.id),
  );
  const characterIds = formData
    .getAll("characterIds")
    .map(Number)
    .filter((id) => allowed.has(id));
  if (amount > 0 && characterIds.length === 0) {
    return { error: "Ohne ausgewählte Charaktere lassen sich keine AP vergeben." };
  }

  const result = await completeMissionWithAp({
    missionId,
    amount,
    characterIds,
    note,
    createdByUserId: user.id,
  });
  if (!result.ok) return { error: result.error };

  revalidateMission(result.slug);
  revalidatePath("/gm/campaign");
  revalidatePath("/gm/ap");

  return {
    success:
      result.characterCount > 0
        ? `„${result.title}" abgeschlossen, je ${amount} AP an ${result.characterCount} Charaktere gebucht.`
        : `„${result.title}" abgeschlossen.`,
  };
}
