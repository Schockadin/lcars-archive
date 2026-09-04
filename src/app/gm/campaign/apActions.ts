"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import { awardAp, isApReason } from "@/lib/characterAp";
import { listActiveCharactersForAp } from "@/lib/gameSessions";

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

  // Gegen die tatsächliche Auswahlliste prüfen, nicht nur auf „ist eine Zahl":
  // eine veraltete oder erfundene ID liefe sonst in den Fremdschlüssel und
  // flöge als 500er aus der Action, statt als Formularfehler zurückzukommen —
  // dasselbe Vorgehen wie in createSessionAction/completeMissionAction.
  const characterId = Number(formData.get("characterId"));
  const known = await listActiveCharactersForAp();
  if (!known.some((c) => c.id === characterId)) {
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
  // "advancement" und "creation" bucht der Charakterbogen selbst (Steigern bzw.
  // Festschreiben der Erschaffung) — die Spielleitung vergibt und korrigiert.
  if (reason === "advancement" || reason === "creation") {
    return {
      error: "Steigerungen und Erschaffungsreste bucht der Charakterbogen selbst.",
    };
  }
  // Missions-AP gibt es nur über den Missionsabschluss, damit die Mission dabei
  // ausgewählt und auf „abgeschlossen" gesetzt wird (siehe missionApActions.ts).
  if (reason === "mission") {
    return {
      error:
        "Missions-AP werden über „Mission abschließen“ vergeben — dort wird die Mission mit ausgewählt.",
    };
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
  revalidatePath(`/user/characters/${characterId}`);

  return {
    success: `${amount > 0 ? "+" : ""}${amount} AP gebucht.`,
  };
}
