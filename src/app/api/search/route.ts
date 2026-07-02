import { NextRequest, NextResponse } from "next/server";
import { searchLive } from "@/lib/search";

// Jederzeit frisch — die Suche hängt am Query-Parameter.
export const dynamic = "force-dynamic";

// Live-Dropdown im Header — reine Titelsuche, niedriges Limit pro Typ.
// Die Volltextsuche (Titel + Inhalt, mit Snippet) läuft über die eigene
// /search-Seite (src/lib/search.ts#searchFull), nicht über diese Route.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const results = await searchLive(q);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Suche fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Suche fehlgeschlagen" },
      { status: 500 },
    );
  }
}
