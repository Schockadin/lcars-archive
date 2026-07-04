"use server";
import { requireAdmin } from "@/lib/dal";
import { revalidateAllContent } from "@/lib/revalidate";

export interface RevalidateActionState {
  tags?: string[];
  error?: string;
}

// Admin-Panel-Auslöser für die Cache-Invalidierung. Ruft revalidateAllContent()
// direkt auf, statt wie zuvor per HTTP gegen die eigene /api/revalidate-Route
// zu fetchen: der Self-Fetch (URL aus getBaseUrl(), also dem Host-Header des
// aktuellen Requests) landete auf Netlify unzuverlässig nicht bei der Route
// selbst, sondern z.B. bei einer HTML-Fehler-/Gate-Seite (Deploy-Preview-
// Zugriffsschutz o.ä.) — das Parsen dieser HTML-Antwort als JSON scheiterte
// dann mit "Unexpected token '<' ... is not valid JSON". Da diese Server
// Action ohnehin im selben Prozess läuft wie /api/revalidate, braucht es für
// den Admin-Button keinen Netzwerk-Umweg. Die HTTP-Route bleibt unverändert
// für echte externe Aufrufer bestehen (Ingest-Skript, künftiger Cronjob).
export async function runRevalidateAction(
  _state: RevalidateActionState,
): Promise<RevalidateActionState> {
  await requireAdmin();

  try {
    const tags = revalidateAllContent();
    return { tags };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Revalidate fehlgeschlagen.",
    };
  }
}
