import { NextRequest } from "next/server";
import { revalidateAllContent } from "@/lib/revalidate";

// Geschützter Endpoint zum Invalidieren der Inhalts-Caches. Wird am Ende des
// Ingest-Skripts aufgerufen (scripts/ingest/index.ts) und kann künftig von
// weiteren Mutationsquellen genutzt werden.
//
// Authentifizierung über REVALIDATE_SECRET (als `Authorization: Bearer <secret>`
// oder `?secret=<secret>`).

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json(
      { revalidated: false, error: "REVALIDATE_SECRET nicht konfiguriert" },
      { status: 500 },
    );
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");

  if (provided !== secret) {
    return Response.json(
      { revalidated: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tags = revalidateAllContent();
  return Response.json({ revalidated: true, tags, now: Date.now() });
}
