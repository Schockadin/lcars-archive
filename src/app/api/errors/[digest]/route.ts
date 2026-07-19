// Admin-only Detail-Abruf für die 500-Seite (ServerErrorContent.tsx) —
// liefert das zu einem Fehler-Digest geloggte error_logs-Zeile. Prüft
// serverseitig nochmal getViewer()?.role === "admin", defensiv auch wenn
// der Client-seitige /api/session-Check in ServerErrorContent.tsx schon
// admin sagte (gleiches Prinzip wie /api/export/*).
import { getViewer } from "@/lib/visibility";
import { getServerErrorByDigest } from "@/lib/errorLog";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ digest: string }> },
) {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") {
    return new Response("Nicht autorisiert.", { status: 403 });
  }

  const { digest } = await params;
  const entry = await getServerErrorByDigest(digest);
  if (!entry) {
    return new Response("Kein geloggter Fehler mit diesem Digest gefunden.", {
      status: 404,
    });
  }

  return Response.json(
    {
      message: entry.message,
      stack: entry.stack,
      routePath: entry.routePath,
      routeType: entry.routeType,
      createdAt: entry.createdAt,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
