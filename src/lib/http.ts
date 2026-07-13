import "server-only";
import { headers } from "next/headers";

// SITE_URL (siehe .env.example) ist bewusst eine kommaseparierte Liste für
// die Revalidation und deshalb hier ungeeignet — der Host-Header des
// aktuellen Requests liefert immer die korrekte Basis-URL der gerade
// laufenden Umgebung (dev/preview/prod).
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Für Rate-Limiting (src/lib/loginAttempts.ts, src/lib/passwordResetLimiter.ts).
// x-nf-client-connection-ip kommt direkt von Netlifys Edge und ist dort nicht
// vom Client fälschbar (im Gegensatz zu x-forwarded-for, das ein Client
// selbst mitschicken könnte) — bevorzugt, wenn vorhanden. x-forwarded-for
// bleibt der Fallback für lokale Entwicklung/andere Umgebungen; nur der
// erste (am weitesten client-seitige) Eintrag der Liste zählt.
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const nfIp = h.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp;

  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return null;
}
