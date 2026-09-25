import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/dal";
import { touchLastVisit } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import { userPermissions } from "@/lib/permissions";
import { userHasCharacters } from "@/lib/characters";


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
// lib/db.ts hielt pro Funktionsinstanz damals nur eine einzige DB-Verbindung
// (max: 1, PgBouncer-Transaction-Mode) — friert Netlifys Node-Function-
// Runtime die Instanz ein, bevor ein nachgelagerter after()-Callback seine
// Query beendet hat, bleibt diese eine Verbindung in einem hängenden
// Zustand zurück und blockiert JEDE weitere Anfrage auf derselben
// (wiederverwendeten) Instanz auf unbestimmte Zeit — beobachtet als leerer
// Header/endlose Ladezustände auf komplett anderen Seiten.
export async function GET() {
  // Rolle UND effektive Rechte frisch aus der DB auflösen (nicht aus dem
  // Cookie) — eine vom Admin geänderte Rolle/Rechte-Zuweisung wirkt so sofort,
  // ohne dass sich der User neu einloggen muss. Steuert die Header-Navigation
  // (HeaderUserNav) per Recht statt per Rolle. getActiveUser prüft dabei
  // zugleich is_active und session_version mit: ein deaktiviertes Konto
  // bekommt hier dieselbe Antwort wie ein ausgeloggtes, statt weiter seine
  // vollständige Navigation zu sehen.
  const user = await getActiveUser();
  // Die drei Folgeabfragen hängen nur vom User ab, nicht voneinander — parallel
  // statt nacheinander (lib/db.ts hält mehrere Verbindungen, siehe dort). Der
  // Header wartet auf diese Antwort; gerade beim Kaltstart einer Instanz, wo
  // jede Abfrage zuerst ihre Verbindung aufbauen muss, sparte das zwei
  // vollständige Roundtrips.
  //
  // - touchLastVisit drosselt selbst auf einen Write pro Nutzer alle 15
  //   Minuten (siehe lib/users.ts).
  // - Rollen-Map laden und explizit durchreichen, damit userPermissions gegen
  //   die aktuellen (evtl. bearbeiteten/eigenen) Rollen auflöst.
  // - hasCharacters steuert den „Charaktere"-Menüpunkt (HeaderUserNav): nur
  //   User mit mindestens einem verknüpften Charakter bekommen ihn. Bewusst
  //   eine eigene EXISTS-Abfrage statt der vollen Charakterliste.
  const [, roleMap, hasCharacters] = user
    ? await Promise.all([
        touchLastVisit(user.id),
        getRoleMap(),
        userHasCharacters(user.id),
      ])
    : [undefined, null, false];
  const permissions =
    user && roleMap ? [...userPermissions(user, roleMap)] : [];
  // Explizite No-Store-Header (der Endpunkt ist ohnehin per-Request
  // dynamisch, da er Cookies liest): dieser Endpunkt liefert userId/role,
  // personalisierte Daten,
  // die niemals von einem zwischengeschalteten Cache (Netlifys CDN/Edge,
  // Browser-HTTP-Cache) für einen anderen User wiederverwendet werden
  // dürfen — genau das würde sonst wie ein fremder eingeloggter Account im
  // Header aussehen.
  return NextResponse.json(
    {
      userId: user?.id ?? null,
      role: user?.role ?? null,
      permissions,
      hasCharacters,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    },
  );
}
