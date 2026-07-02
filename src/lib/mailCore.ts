// Eigentliche Mail-Logik ohne "server-only"-Markierung, damit sie sowohl von
// der App (via mail.ts) als auch von den Ingest-Skripten (scripts/ingest/
// notify.ts, per tsx außerhalb von Next ausgeführt) importiert werden kann —
// "server-only" lässt sich nur innerhalb von Next.js' Webpack-Build auflösen
// (siehe next/dist/compiled/server-only), unter tsx/Node direkt nicht.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailResult {
  sent: boolean;
  error?: string;
}

// Versand über die Resend-REST-API per fetch statt des offiziellen SDKs —
// keine zusätzliche Abhängigkeit nötig (gleiche Linie wie node:crypto statt
// einer Session-Bibliothek in src/lib/session.ts). Schlägt der Versand fehl
// (z.B. RESEND_API_KEY fehlt noch), wird das nur zurückgegeben, nie
// geworfen — der Aufrufer (createUserAction) zeigt dem GM in dem Fall den
// Aktivierungslink zum manuellen Weiterleiten an, statt die Nutzeranlage
// insgesamt scheitern zu lassen.
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: "RESEND_API_KEY ist nicht gesetzt." };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Neo Archive <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: `Resend antwortete mit ${res.status}: ${body}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendActivationEmail(input: {
  to: string;
  name: string;
  activationUrl: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: "Dein Zugang zum Neo Archive",
    html: `
      <p>Hallo ${input.name},</p>
      <p>für dich wurde ein Zugang zum Neo Archive angelegt.</p>
      <p>
        Klicke auf den folgenden Link, um dein Konto zu aktivieren und ein
        Passwort festzulegen:
      </p>
      <p><a href="${input.activationUrl}">${input.activationUrl}</a></p>
      <p>Der Link ist 7 Tage gültig.</p>
      <p>— Neo Archive</p>
    `,
  });
}

// Sammel-Mail nach einem Ingest-Lauf: eine Mail pro User, unabhängig davon,
// wie viele abonnierte Inhalte sich geändert haben (kein Mail-Spam bei
// größeren Vault-Importen mit vielen gleichzeitigen Änderungen).
export async function sendSubscriptionDigest(input: {
  to: string;
  name: string;
  items: { title: string; href: string }[];
}): Promise<SendEmailResult> {
  const list = input.items
    .map((item) => `<li><a href="${item.href}">${item.title}</a></li>`)
    .join("\n");

  return sendEmail({
    to: input.to,
    subject: "Neuigkeiten zu deinen Abos im Neo Archive",
    html: `
      <p>Hallo ${input.name},</p>
      <p>bei folgenden von dir abonnierten Inhalten gibt es Neuigkeiten:</p>
      <ul>${list}</ul>
      <p>— Neo Archive</p>
    `,
  });
}
