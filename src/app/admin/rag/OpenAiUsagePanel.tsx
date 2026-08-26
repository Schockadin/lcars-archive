"use client";
import { useState } from "react";
import {
  fetchOpenAiUsageAction,
  type OpenAiUsageResult,
} from "./openaiUsageAction";

// Admin-only (siehe page.tsx) — zeigt die aktuelle OpenAI-Nutzung (Kosten des
// laufenden Monats) und, soweit die API es hergibt, das verbleibende Guthaben
// des Kontos, das die RAG-Embeddings erzeugt. Lädt bewusst NICHT automatisch
// beim Rendern (ein OpenAI-Request pro Seitenaufruf wäre unnötig) — die Abfrage
// startet auf Knopfdruck.

function formatCurrency(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    // Unbekannter Währungscode → schlichte Darstellung.
    return `${amount.toFixed(2)} ${code}`;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function OpenAiUsagePanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OpenAiUsageResult | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setResult(await fetchOpenAiUsageAction());
    } catch {
      setResult({
        error: "Beim Abfragen der OpenAI-Nutzung ist ein Fehler aufgetreten.",
      });
    } finally {
      setLoading(false);
    }
  }

  const currency = result?.currency ?? "usd";

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-ink-dim text-[13px]">
        Zeigt die Kosten des laufenden Kalendermonats für das OpenAI-Konto, das
        die Embeddings des Archiv-Assistenten erzeugt. Die Costs-API benötigt
        einen Admin-API-Key (sk-admin-…, per{" "}
        <code>OPENAI_ADMIN_API_KEY</code>); ohne ihn wird der normale
        OpenAI-Schlüssel versucht. Das Restguthaben ist bei OpenAI nur
        eingeschränkt über die API abrufbar.
      </p>

      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {loading ? "Wird abgefragt…" : "Nutzung abfragen"}
      </button>

      {result?.error && (
        <p className="text-lcars-quinary" role="alert">
          {result.error}
        </p>
      )}

      {result && !result.error && (
        <dl className="flex flex-col gap-[8px] text-[14px]">
          <div className="flex flex-wrap items-baseline gap-x-[10px]">
            <dt className="text-lcars-ink-dim">Kosten (laufender Monat):</dt>
            <dd className="text-lcars-ink-data font-[var(--font-mono)]">
              {typeof result.monthCostAmount === "number"
                ? formatCurrency(result.monthCostAmount, currency)
                : "—"}
            </dd>
          </div>

          {typeof result.creditAvailable === "number" ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-[10px]">
                <dt className="text-lcars-ink-dim">Verfügbares Guthaben:</dt>
                <dd className="text-lcars-ink-data font-[var(--font-mono)]">
                  {formatCurrency(result.creditAvailable, currency)}
                </dd>
              </div>
              {typeof result.creditGranted === "number" &&
                typeof result.creditUsed === "number" && (
                  <div className="flex flex-wrap items-baseline gap-x-[10px]">
                    <dt className="text-lcars-ink-dim">Guthaben genutzt:</dt>
                    <dd className="text-lcars-ink font-[var(--font-mono)]">
                      {formatCurrency(result.creditUsed, currency)} /{" "}
                      {formatCurrency(result.creditGranted, currency)}
                    </dd>
                  </div>
                )}
            </>
          ) : (
            result.creditNote && (
              <p className="text-lcars-ink-dim text-[13px]">
                {result.creditNote}
              </p>
            )
          )}

          {result.fetchedAt && (
            <p className="text-lcars-ink-dim text-[12px]">
              Stand: {formatDateTime(result.fetchedAt)}
            </p>
          )}
        </dl>
      )}
    </div>
  );
}
