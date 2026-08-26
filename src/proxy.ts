import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  decodeSessionToken,
} from "@/lib/sessionToken";

// Next-16-Proxy (ehem. middleware.ts). Zentraler, OPTIMISTISCHER Zugriffs-
// Guard: leitet anonyme Besucher von den angemeldeten Bereichen (/user,
// /admin, /users) auf /login um, BEVOR überhaupt eine Seite gerendert wird.
//
// Bewusst nur ein optimistischer Check (siehe Next.js-Doku „Optimistic checks
// with Proxy"): Es wird ausschließlich das Session-Cookie gelesen und dessen
// HMAC-Signatur + Ablaufdatum geprüft (decodeSessionToken, rein rechnerisch) —
// KEIN DB-Zugriff. Grund: Der Proxy läuft bei jedem Request (auch bei
// prefetchten Routen); DB-Abfragen hier wären ein Performance-Problem.
//
// Der Proxy ist damit die schnelle Vorfilterung, NICHT die eigentliche
// Zugriffskontrolle. Die verbindliche Prüfung bleibt in der Data Access Layer
// (src/lib/dal.ts): getCurrentUser prüft zusätzlich is_active und
// session_version frisch aus der DB, requireStaff/requireNonGuest/
// requirePermission setzen Rollen/Rechte durch. So bleibt die DAL die „Single
// Source of Truth" (Defense in Depth) — der Proxy fängt nur den Großteil der
// nicht angemeldeten Zugriffe früh ab.
//
// Rollen-/Rechte-Prüfungen (Staff für /admin, Nicht-Gast für /users) macht der
// Proxy bewusst NICHT — die bräuchten einen DB-Lookup. Sie bleiben in den
// jeweiligen Layouts/Seiten (requireStaff/requireNonGuest) bzw. Actions.

const PROTECTED_PREFIXES = ["/user", "/admin", "/users"] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? decodeSessionToken(token) : null;

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Der Proxy läuft nur auf den geschützten Bereichen. Ohne matcher liefe er auf
// JEDEM Request (inkl. _next/static, Bildern, public/) — die Prefixe hier
// spiegeln PROTECTED_PREFIXES. `/:path*` deckt sowohl den Basispfad (z.B.
// /user) als auch alle Unterpfade (/user/...) ab.
export const config = {
  matcher: ["/user/:path*", "/admin/:path*", "/users/:path*"],
};
