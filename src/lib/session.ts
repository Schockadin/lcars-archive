import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@/types/db";
import {
  DEFAULT_THEME_ID,
  normalizeThemeId,
  encodeThemeOverrides,
  sanitizeThemeOverrides,
  type ThemeOverrides,
} from "@/lib/themes";

const COOKIE_NAME = "neo_session";
// Bewusst NICHT httpOnly: das Root-Layout-Init-Skript (src/app/layout.tsx)
// liest diese Cookies clientseitig aus, um Farbtheme + Individualisierung vor
// dem ersten Paint zu setzen. Sie enthalten nur (öffentliche) Theme-ID bzw.
// Token→Hex-Paare, keine sensiblen Daten. Quelle der Wahrheit bleiben
// users.color_theme / users.theme_overrides; die Cookies sind nur der
// FOUC-freie Transport für die Anzeige und werden bei Login/Speichern gespiegelt.
export const THEME_COOKIE_NAME = "neo_theme";
export const THEME_CUSTOM_COOKIE_NAME = "neo_theme_custom";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

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
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

// Signierter (nicht verschlüsselter) Cookie-Wert: Payload enthält keine
// sensiblen Daten (siehe SessionPayload), die Signatur verhindert nur
// Manipulation durch den Client.
function encode(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

function decode(token: string): SessionPayload | null {
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expected = Buffer.from(sign(json));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString()) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: number;
  email: string;
  role: User["role"];
  session_version: number;
  // Optional: werden — falls vorhanden — in die JS-lesbaren Theme-Cookies
  // gespiegelt, damit Farbtheme + Individualisierung nach Login/Reissue sofort
  // (FOUC-frei) greifen.
  color_theme?: string;
  theme_overrides?: Record<string, string>;
}): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = encode({
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresAt,
    sessionVersion: user.session_version,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });

  await setThemeCookie(normalizeThemeId(user.color_theme), expiresAt);
  await setThemeCustomCookie(
    sanitizeThemeOverrides(user.theme_overrides),
    expiresAt,
  );
}

// Schreibt (oder entfernt) das JS-lesbare Theme-Cookie. Für "standard" wird das
// Cookie gelöscht statt gesetzt — das Init-Skript behandelt „kein Cookie" und
// „standard" identisch (unverändertes Interface), so bleibt es aufgeräumt.
export async function setThemeCookie(
  theme: string,
  expiresAtMs: number = Date.now() + SESSION_DURATION_MS,
): Promise<void> {
  const cookieStore = await cookies();
  const normalized = normalizeThemeId(theme);
  if (normalized === DEFAULT_THEME_ID) {
    cookieStore.delete(THEME_COOKIE_NAME);
    return;
  }
  cookieStore.set(THEME_COOKIE_NAME, normalized, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAtMs),
    path: "/",
  });
}

// Schreibt (oder entfernt) das JS-lesbare Cookie mit den Token-Overrides.
// Leere Overrides ⇒ Cookie löschen (das Init-Skript behandelt „kein Cookie"
// als „keine Individualisierung").
export async function setThemeCustomCookie(
  overrides: ThemeOverrides,
  expiresAtMs: number = Date.now() + SESSION_DURATION_MS,
): Promise<void> {
  const cookieStore = await cookies();
  const encoded = encodeThemeOverrides(overrides);
  if (!encoded) {
    cookieStore.delete(THEME_CUSTOM_COOKIE_NAME);
    return;
  }
  cookieStore.set(THEME_CUSTOM_COOKIE_NAME, encoded, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAtMs),
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  // Theme-Cookies beim Logout mit entfernen, damit die nächste (ausgeloggte)
  // Ansicht wieder das Standard-Interface ohne Individualisierung zeigt.
  cookieStore.delete(THEME_COOKIE_NAME);
  cookieStore.delete(THEME_CUSTOM_COOKIE_NAME);
}
