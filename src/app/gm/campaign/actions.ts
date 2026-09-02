"use server";
import { requireGM } from "@/lib/dal";
import { setIngameYear } from "@/lib/campaign";

export interface IngameYearState {
  error?: string;
  success?: boolean;
  year?: number | null;
  auto?: boolean;
}

// Setzt das Ingame-Jahr der Kampagne. Zwei Modi (über das `mode`-Feld des
// geklickten Buttons):
//   - "auto":   manuellen Override entfernen → Jahr wird wieder automatisch aus
//               dem spätesten Missionslog abgeleitet (setIngameYear(null)).
//   - "manual": das eingegebene Jahr als festen Override setzen (bleibt fix,
//               bis wieder auf Automatik geschaltet wird).
// GM-oder-admin, wie der ganze /admin-Bereich (requireGM als Baseline-Gate).
export async function setIngameYearAction(
  _state: IngameYearState,
  formData: FormData,
): Promise<IngameYearState> {
  await requireGM();

  const mode = String(formData.get("mode") ?? "manual");
  if (mode === "auto") {
    await setIngameYear(null);
    return { success: true, auto: true };
  }

  const raw = String(formData.get("ingameYear") ?? "").trim();
  if (!raw) {
    return {
      error: "Bitte ein Jahr angeben oder auf Automatik zurückschalten.",
    };
  }

  const year = Number(raw);
  if (!Number.isInteger(year) || year < 0 || year > 999999) {
    return { error: "Bitte ein gültiges Jahr angeben." };
  }

  await setIngameYear(year);
  return { success: true, year, auto: false };
}
