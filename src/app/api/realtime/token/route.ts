import { Rest } from "ably";
import { connection } from "next/server";
import { REALTIME_REFRESH_CHANNEL } from "@/lib/realtimeShared";

export async function GET() {
  // The token request contains a fresh timestamp and nonce and must never be
  // generated as part of the build-time response.
  await connection();

  const key = process.env.ABLY_API_KEY?.trim();
  if (!key) {
    return Response.json(
      { error: "Realtime ist nicht konfiguriert." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rest = new Rest({ key });
    const tokenRequest = await rest.auth.createTokenRequest({
      capability: JSON.stringify({ [REALTIME_REFRESH_CHANNEL]: ["subscribe"] }),
    });

    return Response.json(tokenRequest, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("Realtime-Token konnte nicht erstellt werden.", error);
    return Response.json(
      { error: "Realtime-Token konnte nicht erstellt werden." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
