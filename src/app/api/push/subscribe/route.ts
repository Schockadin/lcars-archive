import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  deleteSubscription,
  saveSubscription,
  InvalidPushEndpointError,
} from "@/lib/pushSubscriptions";

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

// Reines JSON-API — bewusst per getSession() statt verifySession()/
// getCurrentUser() geprüft, die bei fehlender Session redirecten würden
// (richtig für Seiten, falsch für einen Fetch-Endpunkt); gleiches Muster
// wie src/app/api/session/route.ts.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Ungültige Push-Subscription." },
      { status: 400 },
    );
  }

  try {
    await saveSubscription(session.userId, { endpoint, p256dh, auth });
  } catch (err) {
    if (err instanceof InvalidPushEndpointError) {
      return NextResponse.json(
        { error: "Ungültiger Push-Endpoint." },
        { status: 400 },
      );
    }
    throw err;
  }
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint fehlt." }, { status: 400 });
  }

  await deleteSubscription(session.userId, endpoint);
  return NextResponse.json({ deleted: true });
}
