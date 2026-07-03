import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Winziger, DB-freier Endpunkt (nur Cookie-Signatur-Prüfung), damit die
// Sidebar client-seitig weiß, ob "Home" auf das eigene Dashboard zeigen
// soll. Bewusst NICHT über den Root-Layout/Server-Component-Pfad gelöst:
// cookies() dort würde die komplette Seite (Charaktere, Missionen, Archiv,
// Timeline, Home) zwingend dynamisch machen und ihre aktuell statische
// Auslieferung über Netlifys CDN verlieren — genau die Art von
// Server-Roundtrip, die im User-Bereich schon spürbar Zeit kostet.
export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    userId: session?.userId ?? null,
    role: session?.role ?? null,
  });
}
