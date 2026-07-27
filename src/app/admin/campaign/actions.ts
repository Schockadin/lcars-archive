"use server";
import { requireGM } from "@/lib/dal";
import { setIngameYear } from "@/lib/campaign";

export interface IngameYearState {
  error?: string;
  success?: boolean;
  year?: number | null;
}

// Setzt (oder löscht) das aktuelle Ingame-Jahr der Kampagne. GM-oder-admin,
// wie der ganze /admin-Bereich (requireGM als Baseline-Gate). Ein leeres Feld
// löscht das Jahr (null) — dann fällt das angezeigte Charakter-Alter auf das
// manuell gepflegte metadata.age zurück.
export async function setIngameYearAction(
  _state: IngameYearState,
  formData: FormData,
): Promise<IngameYearState> {
  await requireGM();

  const raw = String(formData.get("ingameYear") ?? "").trim();
  if (!raw) {
    await setIngameYear(null);
    return { success: true, year: null };
  }

  const year = Number(raw);
  if (!Number.isInteger(year) || year < 0 || year > 999999) {
    return { error: "Bitte ein gültiges Jahr angeben." };
  }

  await setIngameYear(year);
  return { success: true, year };
}
