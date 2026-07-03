import "server-only";
import sql from "@/lib/db";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
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

