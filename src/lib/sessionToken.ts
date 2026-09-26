import crypto from "node:crypto";
import type { User } from "@/types/db";

// Reine Signatur-/Kodierungslogik des Session-Cookies, bewusst OHNE
// "server-only" und OHNE next/headers: Die eigentliche Session-Verwaltung
// liegt in src/lib/session.ts (liest cookies() aus next/headers); dieses
// Modul bleibt davon frei, damit es auch ohne Next-Kontext (Tests, Skripte)
// nutzbar ist. Die Prüfung ist rein rechnerisch (HMAC + Ablaufdatum), OHNE
// DB-Zugriff.
//
// Früher las zusätzlich ein Next-Proxy (src/proxy.ts) das Cookie hier aus;
// er ist entfernt (Begründung in src/app/user/layout.tsx).

export const SESSION_COOKIE_NAME = "neo_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

export interface SessionPayload {
  userId: number;
  email: string;
  role: User["role"];
  expiresAt: number;
  // Muss mit users.session_version übereinstimmen (siehe getCurrentUser in
  // dal.ts) — erhöht sich bei jeder Passwortänderung (setPassword), damit
  // ein zu diesem Zeitpunkt bereits ausgestelltes Cookie danach verworfen
  // wird statt bis zum natürlichen Ablauf (30 Tage) gültig zu bleiben.
  sessionVersion: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ist nicht gesetzt");
  }
  return secret;
}

function sign(value: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

// Signierter (nicht verschlüsselter) Cookie-Wert: Payload enthält keine
// sensiblen Daten (siehe SessionPayload), die Signatur verhindert nur
// Manipulation durch den Client.
export function encodeSessionToken(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

export function decodeSessionToken(token: string): SessionPayload | null {
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  // sign()/getSecret() bewusst AUSSERHALB des try: ein fehlendes SESSION_SECRET
  // ist eine Server-Fehlkonfiguration und MUSS laut scheitern (wie zuvor in
  // session.ts' decode()), nicht still als „ungültige Session" durchgehen —
  // sonst erschienen bei fehlendem Secret plötzlich alle Nutzer:innen
  // app-weit abgemeldet, ohne erkennbaren Fehler. Der Proxy ruft
  // decodeSessionToken nur mit tatsächlich vorhandenem Cookie auf; ein hier
  // geworfener Konfigurationsfehler soll auch dort sichtbar werden.
  const expected = Buffer.from(sign(json));

  // Nur die Token-INHALTS-Fehler (falsche Signatur-Länge, kaputtes base64/JSON)
  // werden zu „ungültige Session" (null) — nicht die Fehlkonfiguration oben.
  try {
    const actual = Buffer.from(signature);
    if (
      expected.length !== actual.length ||
      !crypto.timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(json, "base64url").toString(),
    ) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
