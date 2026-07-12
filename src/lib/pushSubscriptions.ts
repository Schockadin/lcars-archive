import "server-only";
import sql from "@/lib/db";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class InvalidPushEndpointError extends Error {}

// Ein echter Browser liefert als endpoint IMMER eine URL des Push-Dienstes
// seines Anbieters — nie eine beliebige Adresse. Ohne diese Prüfung könnte
// ein eingeloggter User hier jede beliebige URL (z.B. eine interne Adresse
// wie http://169.254.169.254/... oder einen internen Admin-Dienst)
// hinterlegen: sendPushToUser (pushCore.ts) schickt bei jedem
// Benachrichtigungs-Ereignis serverseitig einen signierten POST-Request
// genau an diesen endpoint — ein klassischer SSRF-Vektor. Die Positivliste
// deckt die Push-Dienste der vier großen Browser-Engines ab (Chrome/Edge/
// Samsung Internet nutzen alle FCM).
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, Samsung Internet, Opera
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com", // Safari
];

function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_PUSH_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
}

// endpoint ist global UNIQUE (nicht user_id+endpoint) — ON CONFLICT hängt
// die Zeile bei einem Account-Wechsel auf demselben Gerät um, statt einen
// Duplikatsfehler zu werfen (siehe Kommentar in scripts/schema.sql). Ein
// erfolgreich registriertes Gerät reaktiviert push_notifications_enabled
// automatisch, damit ein zuvor global deaktivierter Schalter nicht die neu
// erteilte Berechtigung im Browser stumm ignoriert.
export async function saveSubscription(
  userId: number,
  sub: PushSubscriptionInput,
): Promise<void> {
  if (!isAllowedPushEndpoint(sub.endpoint)) {
    throw new InvalidPushEndpointError("Ungültiger Push-Endpoint.");
  }

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth})
    ON CONFLICT (endpoint)
    DO UPDATE SET user_id = ${userId}, p256dh = ${sub.p256dh}, auth = ${sub.auth}
  `;
  await sql`UPDATE users SET push_notifications_enabled = true WHERE id = ${userId}`;
}

// Owner-scoped: ein User kann nur eigene Subscriptions löschen.
export async function deleteSubscription(
  userId: number,
  endpoint: string,
): Promise<void> {
  await sql`
    DELETE FROM push_subscriptions
    WHERE user_id = ${userId} AND endpoint = ${endpoint}
  `;
}

