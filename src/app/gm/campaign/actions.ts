"use server";
import { requireGM } from "@/lib/dal";
import { setIngameYear } from "@/lib/campaign";
import { publishContentChanged } from "@/lib/realtimeServer";
import { revalidatePath } from "next/cache";
import { saveSessionDefaults } from "@/lib/sessionDefaults";
import { isSessionDefaultTime } from "@/lib/sessionDefaultsFormat";

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
    await publishContentChanged();
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
  await publishContentChanged();
  return { success: true, year, auto: false };
}

export interface SessionDefaultsState {
  error?: string;
  success?: boolean;
}

export async function saveSessionDefaultsAction(
  _state: SessionDefaultsState,
  formData: FormData,
): Promise<SessionDefaultsState> {
  await requireGM();

  const rawWeekday = String(formData.get("weekday") ?? "").trim();
  if (!/^[0-6]$/.test(rawWeekday)) {
    return { error: "Bitte einen gültigen Wochentag auswählen." };
  }

  const weekParity = String(formData.get("weekParity") ?? "").trim();
  if (weekParity !== "odd" && weekParity !== "even") {
    return { error: "Bitte eine gültige Kalenderwochen-Parität auswählen." };
  }

  const time = String(formData.get("time") ?? "").trim();
  if (!isSessionDefaultTime(time)) {
    return { error: "Bitte eine gültige Uhrzeit im 24-Stunden-Format angeben." };
  }

  const location = String(formData.get("location") ?? "").trim();
  if (location.length > 200) {
    return { error: "Der Ort darf höchstens 200 Zeichen lang sein." };
  }

  await saveSessionDefaults({
    weekday: Number(rawWeekday),
    weekParity,
    time,
    location,
  });
  revalidatePath("/gm/campaign");
  revalidatePath("/gm/sessions");
  await publishContentChanged();
  return { success: true };
}

