"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import { awardAp, isApReason } from "@/lib/characterAp";

export interface ApAwardState {
  error?: string;
  success?: string;
}

// AP an einen Charakter vergeben. Wie die übrigen Kampagnen-Werkzeuge
// gm-oder-admin (requireGM prüft die Rolle frisch aus der DB, nicht aus dem
// Session-Cookie). Negative Beträge sind erlaubt — eine Fehlbuchung soll sich
// korrigieren lassen, ohne in der Datenbank herumzuoperieren.
export async function awardApAction(
  state: ApAwardState,
  formData: FormData,
): Promise<ApAwardState> {
  const user = await requireGM();

  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isInteger(amount) || amount === 0) {
    return { error: "Bitte eine ganze Zahl ungleich 0 angeben." };
  }
  if (Math.abs(amount) > 999) {
    return { error: "Betrag zu groß (max. 999 AP je Buchung)." };
  }

  const reason = String(formData.get("reason") ?? "");
  if (!isApReason(reason)) {
    return { error: "Unbekannter Grund." };
  }
  // "advancement" ist den Steigerungen der Spieler:innen vorbehalten — die
  // Spielleitung vergibt/korrigiert, sie bucht keine Steigerung.
  if (reason === "advancement") {
    return { error: "Steigerungen werden von den Spieler:innen selbst gebucht." };
  }

  const note = String(formData.get("note") ?? "").trim() || null;

  await awardAp({
    characterId,
    amount,
    reason,
    note,
    createdByUserId: user.id,
  });

  // Bewusst KEIN Eintrag im Admin-Audit-Log: das protokolliert
  // sicherheitsrelevante Useraccount-Aktionen und verweist mit
  // target_user_id auf Users — eine AP-Buchung zielt auf einen Charakter und
  // würde dort nicht sauber abgebildet. Wer wann wie viel gebucht hat, steht
  // ohnehin in character_ap_entries (created_by/created_at/note).

  revalidatePath("/gm/campaign");
  revalidatePath(`/user/characters/${characterId}/stats`);

  return {
    success: `${amount > 0 ? "+" : ""}${amount} AP gebucht.`,
  };
}
