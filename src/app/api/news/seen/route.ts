import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { markNewsSeen, type NewsSeenTargetType } from "@/lib/newsSeen";

const VALID_TYPES: NewsSeenTargetType[] = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
];

// Markiert den zugehörigen Inhalt als „gesehen", wenn ein eingeloggter User
// eine Inhalts-Detailseite aufruft (siehe MarkNewsSeen.tsx) — damit
// verschwindet eine offene News zu diesem Inhalt aus dem Dashboard-Feed. Über
// eine schlanke API-Route (statt serverseitig in jeder Detailseite), damit die
// Detailseiten statisch/gecacht bleiben und nicht pro Betrachter dynamisch
// werden. Kein Login = stiller No-op.
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 200 });

  let body: { type?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = String(body.type ?? "");
  const slug = String(body.slug ?? "").trim();
  if (!VALID_TYPES.includes(type as NewsSeenTargetType) || !slug) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await markNewsSeen(session.userId, type as NewsSeenTargetType, slug);
  return NextResponse.json({ ok: true });
}
