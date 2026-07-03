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
