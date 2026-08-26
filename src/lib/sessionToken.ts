import crypto from "node:crypto";
import type { User } from "@/types/db";

// Reine Signatur-/Kodierungslogik des Session-Cookies, bewusst OHNE
// "server-only" und OHNE next/headers. Grund: dieselbe Verifikation wird an
// ZWEI Stellen gebraucht, die nicht denselben Kontext haben:
//   1. src/lib/session.ts (Server Components / Actions, liest cookies() aus
//      next/headers) — die eigentliche Session-Verwaltung.
//   2. src/proxy.ts (Next-16-Proxy, ehem. Middleware) — liest das Cookie aus
//      dem NextRequest, um anonyme Besucher optimistisch von geschützten
//      Routen wegzuleiten (siehe dortiger Kommentar). Der Proxy darf nicht
//      "server-only" ziehen und hat keinen Zugriff auf cookies() aus
//      next/headers.
// node:crypto läuft in der Node-Runtime des Proxy problemlos; die Prüfung ist
// rein rechnerisch (HMAC + Ablaufdatum), OHNE DB-Zugriff — genau das, was die
// Next.js-Doku für optimistische Auth-Checks im Proxy empfiehlt.

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
  // Ein einziger try/catch um die gesamte Prüfung: Neben kaputtem JSON kann
  // auch getSecret() werfen (fehlendes SESSION_SECRET). Im Proxy soll ein
  // solcher Fehler nie eine 500 auslösen, sondern schlicht als „keine gültige
  // Session" gelten (→ Redirect auf /login).
  try {
    const [json, signature] = token.split(".");
    if (!json || !signature) return null;

    const expected = Buffer.from(sign(json));
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
