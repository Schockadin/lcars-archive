// Eigentliche Push-Versand-Logik ohne "server-only"-Markierung, damit sie
// sowohl von der App (via push.ts) als auch von den Ingest-Skripten
// (scripts/ingest/notify.ts, per tsx außerhalb von Next ausgeführt)
// importiert werden kann — exakt das gleiche Muster wie mailCore.ts/mail.ts.
import webpush from "web-push";
import postgres from "postgres";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface SendPushResult {
  sent: number;
  failed: number;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

let vapidConfigured = false;
function ensureVapid(): void {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidConfigured = true;
}

// sql wird explizit übergeben statt aus @/lib/db importiert — dieses Modul
// läuft auch außerhalb von Next (tsx), wo der server-only-Import nicht
// auflösbar ist. Schlägt der Versand fehl (z.B. VAPID-Keys fehlen noch),
// wird das nur zurückgegeben, nie geworfen — gleiches Prinzip wie
// sendEmail in mailCore.ts.
export async function sendPushToUser(
  sql: postgres.Sql,
  userId: number,
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!isConfigured()) {
    return { sent: 0, failed: 0 };
  }
  ensureVapid();

  const subscriptions = await sql<
    { endpoint: string; p256dh: string; auth: string }[]
  >`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ${userId}
  `;
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const body = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
      );
      sent++;
    } catch (err) {
      failed++;
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      // Abgelaufene/widerrufene Subscription (Browser hat sie serverseitig
      // gelöscht) — bereinigen statt bei jedem künftigen Versand erneut zu
      // scheitern.
      if (statusCode === 404 || statusCode === 410) {
        await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
      }
    }
  }

  return { sent, failed };
}
