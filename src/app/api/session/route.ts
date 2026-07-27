import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { touchLastVisit, getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import { userPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Winziger, für den Client selbst DB-freier Endpunkt (nur Cookie-Signatur-
// Prüfung), damit die Sidebar client-seitig weiß, ob "Home" auf das eigene
// Dashboard zeigen soll. Bewusst NICHT über den Root-Layout/Server-
// Component-Pfad gelöst: cookies() dort würde die komplette Seite
// (Charaktere, Missionen, Archiv, Timeline, Home) zwingend dynamisch machen
// und ihre aktuell statische Auslieferung über Netlifys CDN verlieren —
// genau die Art von Server-Roundtrip, die im User-Bereich schon spürbar
// Zeit kostet.
//
// Der Header ruft diesen Endpunkt client-seitig auf JEDER Seite auf (siehe
// HeaderContent.tsx) — der ideale, immer erreichte Ort, um last_visit_at zu
// pflegen ("Aufruf einer Seite durch den User"), ohne dafür eine eigene
// Server-Component-Stelle auf jeder einzelnen Seite einzubauen. touchLastVisit
// selbst drosselt auf einen DB-Write pro Nutzer alle 15 Minuten (siehe
// lib/users.ts) — der synchrone await hier kostet praktisch nie eine
// zusätzliche Antwortzeit spürbarer Größe. BEWUSST kein after() (mehr):
// lib/db.ts hält pro Funktionsinstanz nur eine einzige DB-Verbindung
// (max: 1, PgBouncer-Transaction-Mode) — friert Netlifys Node-Function-
// Runtime die Instanz ein, bevor ein nachgelagerter after()-Callback seine
// Query beendet hat, bleibt diese eine Verbindung in einem hängenden
// Zustand zurück und blockiert JEDE weitere Anfrage auf derselben
// (wiederverwendeten) Instanz auf unbestimmte Zeit — beobachtet als leerer
// Header/endlose Ladezustände auf komplett anderen Seiten.
export async function GET() {
  const session = await getSession();
  // Rolle UND effektive Rechte frisch aus der DB auflösen (nicht aus dem
  // Cookie) — eine vom Admin geänderte Rolle/Rechte-Zuweisung wirkt so sofort,
  // ohne dass sich der User neu einloggen muss. Steuert die Header-Navigation
  // (HeaderUserNav) per Recht statt per Rolle.
  const user = session ? await getUserById(session.userId) : null;
  if (session) {
    await touchLastVisit(session.userId);
  }
  // Rollen-Map laden, damit userPermissions gegen die aktuellen (evtl.
  // bearbeiteten/eigenen) Rollen auflöst.
  if (user) await getRoleMap();
  const permissions = user ? [...userPermissions(user)] : [];
  // Explizite No-Store-Header statt uns allein auf force-dynamic zu
  // verlassen: dieser Endpunkt liefert userId/role, personalisierte Daten,
  // die niemals von einem zwischengeschalteten Cache (Netlifys CDN/Edge,
  // Browser-HTTP-Cache) für einen anderen User wiederverwendet werden
  // dürfen — genau das würde sonst wie ein fremder eingeloggter Account im
  // Header aussehen.
  return NextResponse.json(
    {
      userId: session?.userId ?? null,
      role: user?.role ?? session?.role ?? null,
      permissions,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    },
  );
}
