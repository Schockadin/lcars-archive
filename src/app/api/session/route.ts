import { NextResponse, after } from "next/server";
import { getSession } from "@/lib/session";
import { touchLastVisit } from "@/lib/users";

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
// lib/users.ts); after() verschiebt selbst diesen gedrosselten Write hinter
// die Response, sodass die Antwortzeit für den Client unverändert bleibt.
export async function GET() {
  const session = await getSession();
  if (session) {
    after(() => touchLastVisit(session.userId));
  }
  return NextResponse.json({
    userId: session?.userId ?? null,
    role: session?.role ?? null,
  });
}
