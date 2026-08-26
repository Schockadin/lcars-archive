import "server-only";
import { cookies } from "next/headers";
import type { User } from "@/types/db";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  encodeSessionToken,
  decodeSessionToken,
  type SessionPayload,
} from "@/lib/sessionToken";
import {
  DEFAULT_THEME_ID,
  normalizeThemeId,
  encodeThemeOverrides,
  sanitizeThemeOverrides,
  THEME_COOKIE_NAME,
  THEME_CUSTOM_COOKIE_NAME,
  type ThemeOverrides,
} from "@/lib/themes";

// Re-Export für serverseitige Aufrufer (z.B. src/app/layout.tsx), die die
// Namen bisher aus der Session bezogen haben. Definiert werden sie in themes.ts
// (nicht server-only), damit auch der clientseitige ThemeApplier sie nutzen kann.
export { THEME_COOKIE_NAME, THEME_CUSTOM_COOKIE_NAME };

// Signatur/Kodierung des Session-Cookies liegen jetzt in sessionToken.ts
// (ohne server-only/next/headers), damit der Proxy (src/proxy.ts) dieselbe
// Verifikation nutzen kann. SessionPayload wird re-exportiert, damit die
// vielen bestehenden Importe aus @/lib/session unverändert bleiben.
export type { SessionPayload } from "@/lib/sessionToken";

const COOKIE_NAME = SESSION_COOKIE_NAME;

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
  const token = encodeSessionToken({
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
  return decodeSessionToken(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  // Theme-Cookies beim Logout mit entfernen, damit die nächste (ausgeloggte)
  // Ansicht wieder das Standard-Interface ohne Individualisierung zeigt.
  cookieStore.delete(THEME_COOKIE_NAME);
  cookieStore.delete(THEME_CUSTOM_COOKIE_NAME);
}
