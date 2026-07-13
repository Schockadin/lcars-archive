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
// NUR x-nf-client-connection-ip, kein x-forwarded-for-Fallback mehr: Diese
// App läuft ausschließlich auf Netlify (siehe netlify.toml/README), wo dieser
// Header immer von Netlifys Edge gesetzt wird und für den Client nicht
// fälschbar ist. x-forwarded-for dagegen kann ein Client ohne vorgeschalteten
// Proxy selbst mitschicken — ein Angreifer könnte damit bei jedem Versuch
// eine andere IP vortäuschen und so das Pro-IP-Limit umgehen. null (statt
// eines fälschbaren Werts) ist der sicherere Fallback: die Rate-Limiter
// behandeln eine fehlende IP als "nur die E-Mail-Grenze greift" statt
// stillschweigend einer manipulierbaren zu vertrauen.
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-nf-client-connection-ip");
}
