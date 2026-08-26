"use server";
import { checkPermission } from "@/lib/dal";

// Liest Nutzung (Kosten des laufenden Monats) und — soweit über die API
// verfügbar — das verbleibende Guthaben des OpenAI-Kontos, das die
// RAG-Embeddings erzeugt. Für das Admin-Panel unter /admin/rag.
//
// Datenquellen (beide Raw-fetch gegen die OpenAI-REST-API, gleicher Stil wie
// mailCore.ts / rag.ts):
//   - Kosten:   GET /v1/organization/costs  (Costs API). Braucht einen
//               ADMIN-API-Key (sk-admin-…), NICHT den normalen Projekt-Key.
//               Deshalb bevorzugt OPENAI_ADMIN_API_KEY, Fallback OPENAI_API_KEY.
//   - Guthaben: GET /dashboard/billing/credit_grants (Legacy). Dieser Endpoint
//               ist offiziell nicht mehr dokumentiert und antwortet mit
//               normalen API-Keys häufig mit 401 — deshalb rein best-effort:
//               schlägt er fehl, bleibt das Guthaben schlicht „nicht
//               verfügbar", ohne die Kostenanzeige zu blockieren.

const OPENAI_BASE = "https://api.openai.com";

export interface OpenAiUsageResult {
  error?: string;
  // Kosten des laufenden Kalendermonats (bis jetzt), in `currency`.
  monthCostAmount?: number;
  currency?: string;
  // Zeitraum-Beginn (ISO), auf den sich monthCostAmount bezieht.
  periodStart?: string;
  // Restguthaben, falls die (Legacy-)Billing-API es hergibt — sonst undefined.
  creditAvailable?: number;
  creditGranted?: number;
  creditUsed?: number;
  // Hinweis, wenn das Guthaben nicht über die API abrufbar war.
  creditNote?: string;
  // Zeitpunkt der Abfrage (ISO), für die Anzeige „Stand: …".
  fetchedAt?: string;
}

function adminKey(): string | undefined {
  return process.env.OPENAI_ADMIN_API_KEY || process.env.OPENAI_API_KEY;
}

// Beginn des laufenden Kalendermonats (UTC) als Unix-Sekunden — Startpunkt der
// Costs-Abfrage.
function monthStartUnix(now: Date): number {
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000,
  );
}

interface CostsResponse {
  data?: Array<{
    results?: Array<{
      amount?: { value?: number; currency?: string };
    }>;
  }>;
}

interface CreditGrantsResponse {
  total_granted?: number;
  total_used?: number;
  total_available?: number;
}

export async function fetchOpenAiUsageAction(): Promise<OpenAiUsageResult> {
  const check = await checkPermission("admin.access");
  if ("error" in check) return { error: check.error };

  const key = adminKey();
  if (!key) {
    return {
      error:
        "OPENAI_API_KEY (bzw. OPENAI_ADMIN_API_KEY) ist nicht gesetzt — Nutzung kann nicht abgefragt werden.",
    };
  }

  const now = new Date();
  const periodStartUnix = monthStartUnix(now);

  // --- Kosten (Costs API, Admin-Key nötig) ---------------------------------
  let monthCostAmount: number | undefined;
  let currency: string | undefined;
  try {
    const params = new URLSearchParams({
      start_time: String(periodStartUnix),
      bucket_width: "1d",
      limit: "31",
    });
    const res = await fetch(
      `${OPENAI_BASE}/v1/organization/costs?${params.toString()}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const hint =
        res.status === 401
          ? " Die Costs-API benötigt einen Admin-API-Key (sk-admin-…); setze OPENAI_ADMIN_API_KEY."
          : "";
      return {
        error: `OpenAI-Costs-API antwortete mit ${res.status}.${hint}${
          body ? ` (${body.slice(0, 200)})` : ""
        }`,
      };
    }
    const json = (await res.json()) as CostsResponse;
    let total = 0;
    for (const bucket of json.data ?? []) {
      for (const result of bucket.results ?? []) {
        const value = result.amount?.value;
        if (typeof value === "number") total += value;
        if (!currency && result.amount?.currency) {
          currency = result.amount.currency;
        }
      }
    }
    monthCostAmount = total;
    currency = currency ?? "usd";
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Nutzung konnte nicht abgefragt werden: ${err.message}`
          : "Nutzung konnte nicht abgefragt werden.",
    };
  }

  // --- Guthaben (Legacy-Billing, best-effort) ------------------------------
  let creditAvailable: number | undefined;
  let creditGranted: number | undefined;
  let creditUsed: number | undefined;
  let creditNote: string | undefined;
  try {
    const res = await fetch(`${OPENAI_BASE}/dashboard/billing/credit_grants`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const json = (await res.json()) as CreditGrantsResponse;
      creditAvailable = json.total_available;
      creditGranted = json.total_granted;
      creditUsed = json.total_used;
    } else {
      creditNote =
        "Restguthaben ist über die API nicht abrufbar (nur im OpenAI-Dashboard einsehbar).";
    }
  } catch {
    creditNote =
      "Restguthaben ist über die API nicht abrufbar (nur im OpenAI-Dashboard einsehbar).";
  }

  return {
    monthCostAmount,
    currency,
    periodStart: new Date(periodStartUnix * 1000).toISOString(),
    creditAvailable,
    creditGranted,
    creditUsed,
    creditNote,
    fetchedAt: now.toISOString(),
  };
}
