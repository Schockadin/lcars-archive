import "server-only";

import { logCaughtError } from "@/lib/errorLog";

export interface NotificationRecipient {
  id: number;
  email: string;
  name: string;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

interface DeliveryResult {
  sent: boolean;
  error?: string;
}

// Einheitliche Best-effort-Zustellung. Die Domäne liefert nur noch die
// konkrete Mail bzw. Push-Nachricht; Parallelisierung, Opt-ins und Logging
// verhalten sich dadurch für alle Inhaltstypen gleich.
export async function deliverNotifications(
  recipients: readonly NotificationRecipient[],
  options: {
    context: string;
    emailFailureLabel: string;
    sendEmail?: (recipient: NotificationRecipient) => Promise<DeliveryResult>;
    sendPush?: (recipient: NotificationRecipient) => Promise<unknown>;
  },
): Promise<void> {
  const reportFailure = (
    channel: string,
    recipient: NotificationRecipient,
    error: unknown,
  ) => {
    const detail = error instanceof Error ? error.message : String(error);
    const message = `${channel} an ${recipient.email} fehlgeschlagen: ${detail}`;
    console.error(message);
    void logCaughtError(new Error(message), options.context);
  };

  await Promise.allSettled(
    recipients.map(async (recipient) => {
      const deliveries: Promise<unknown>[] = [];

      if (recipient.emailNotificationsEnabled && options.sendEmail) {
        deliveries.push(
          options
            .sendEmail(recipient)
            .then((result) => {
              if (!result.sent) {
                reportFailure(
                  options.emailFailureLabel,
                  recipient,
                  result.error ?? "Unbekannter Fehler",
                );
              }
            })
            .catch((error: unknown) =>
              reportFailure(options.emailFailureLabel, recipient, error),
            ),
        );
      }

      if (recipient.pushNotificationsEnabled && options.sendPush) {
        deliveries.push(
          options
            .sendPush(recipient)
            .catch((error: unknown) =>
              reportFailure("Push-Nachricht", recipient, error),
            ),
        );
      }

      await Promise.all(deliveries);
    }),
  );
}
