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

  const from =
    process.env.RESEND_FROM_EMAIL || "Neo Archive <onboarding@resend.dev>";

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
      return {
        sent: false,
        error: `Resend antwortete mit ${res.status}: ${body}`,
      };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : String(err),
    };
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

// Genutzt vom selbstständigen Reset-Request (/forgot-password) UND von
// resetUserPasswordAction (src/app/admin/actions.ts, Admin-Aktion in der
// Userverwaltung) — erzeugt denselben Token-Typ wie sendActivationEmail
// (siehe passwordSetupTokens.ts), nur mit anderem Betreff/Text. In beiden
// Fällen setzt/erfährt ausschließlich der Owner selbst das neue Passwort
// über den Link in seinem Postfach — ein Admin kann darüber nur den Versand
// anstoßen, nie direkt ein Passwort setzen oder einsehen (Schutz vor
// Account-Übernahme durch einen kompromittierten Admin-Account).
export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: "Neues Passwort für dein Neo-Archive-Konto",
    html: `
      <p>Hallo ${input.name},</p>
      <p>
        Klicke auf den folgenden Link, um ein neues Passwort für dein
        Neo-Archive-Konto festzulegen:
      </p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>Der Link ist 7 Tage gültig. Hast du das nicht angefordert, kannst du diese Mail ignorieren.</p>
      <p>— Neo Archive</p>
    `,
  });
}

// Fan-out an alle Admins, wenn ein User über /forgot-password selbst einen
// Reset anfordert — reine Sicherheits-Benachrichtigung, kein Opt-out über
// email_notifications_enabled (das gilt nur für Inhalts-Digests).
export async function sendPasswordResetRequestedEmail(input: {
  to: string;
  name: string;
  requesterEmail: string;
  requesterName: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Passwort-Reset angefordert: ${input.requesterName}`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>
        ${input.requesterName} (${input.requesterEmail}) hat über
        "Passwort vergessen" einen Reset-Link angefordert.
      </p>
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

// Direkt beim Anlegen eines neuen Dialogs an den Gesprächspartner verschickt
// (der dem Anlegen ja nicht zustimmen konnte, siehe createDialogue) — ohne
// diese Mail bemerkt der Partner ein neues Gespräch sonst erst beim nächsten
// zufälligen Besuch der eigenen Inhalte.
export async function sendDialogueStartedEmail(input: {
  to: string;
  name: string;
  fromCharacterName: string;
  dialogueTitle: string;
  dialogueUrl: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Neues Gespräch: "${input.dialogueTitle}"`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>${input.fromCharacterName} hat ein neues Gespräch "${input.dialogueTitle}" mit dir begonnen:</p>
      <p><a href="${input.dialogueUrl}">${input.dialogueUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// Rendert eine kurze, kursive Anriss-Zeile unter der Ankündigung — genutzt
// von jedem "es gibt Neuigkeiten"-Template unten, damit die Mail selbst
// schon einen Eindruck vom Inhalt gibt statt nur Titel + Link (siehe auch
// die Push-Pendants in src/lib/pushCore.ts-Aufrufern, die denselben
// preview-Text im body verwenden).
function previewBlock(preview: string): string {
  return `<p style="color:#666;font-style:italic;">${preview}</p>`;
}

// Direkt nach jeder neuen Dialog-Nachricht an den jeweils anderen
// Teilnehmer verschickt (kein Sammel-Digest wie bei Abos — hier ist jede
// Nachricht ein einzelnes, sofortiges Ereignis).
export async function sendDialogueMessageEmail(input: {
  to: string;
  name: string;
  fromCharacterName: string;
  dialogueTitle: string;
  dialogueUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Neue Nachricht in "${input.dialogueTitle}"`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>${input.fromCharacterName} hat im Gespräch "${input.dialogueTitle}" geantwortet:</p>
      ${previewBlock(input.preview)}
      <p><a href="${input.dialogueUrl}">${input.dialogueUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// Direkt beim Abschließen eines Dialogs an alle Abonnenten der beteiligten
// Charaktere verschickt (nicht bei Erstellung, nicht pro Antwort) — ein
// einzelnes, sofortiges Ereignis, kein Sammel-Digest wie bei Missionen/
// Archiv-Einträgen.
export async function sendCharacterDialogueClosedEmail(input: {
  to: string;
  name: string;
  characterName: string;
  dialogueTitle: string;
  dialogueUrl: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Gespräch mit ${input.characterName} abgeschlossen`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>das Gespräch "${input.dialogueTitle}", an dem ${input.characterName} teilgenommen hat, wurde abgeschlossen.</p>
      <p><a href="${input.dialogueUrl}">${input.dialogueUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An beide beteiligten Spieler verschickt, wenn ein Admin ein Gespräch
// löscht (deleteDialogueAction) — kein Link, der Dialog existiert danach
// nicht mehr.
export async function sendDialogueDeletedEmail(input: {
  to: string;
  name: string;
  dialogueTitle: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Gespräch gelöscht: "${input.dialogueTitle}"`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>
        das Gespräch "${input.dialogueTitle}", an dem du beteiligt warst,
        wurde von der Administration gelöscht.
      </p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle Abonnenten eines Charakters (content_follows, target_type
// 'character'), sobald dieser Charakter bearbeitet wird — sowohl übers volle
// Bearbeiten-Formular als auch über den Inline-Bio-Editor auf der
// Charakterseite (siehe characters/_shared/contentAction.ts bzw.
// updateOwnCharacterBioAction in app/actions/characters.ts). Der Bearbeitende
// selbst (immer der Owner) wird vom Aufrufer ausgeschlossen.
export async function sendCharacterUpdatedEmail(input: {
  to: string;
  name: string;
  characterName: string;
  characterUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Aktualisiert: ${input.characterName}`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>die Akte von ${input.characterName}, den du abonniert hast, wurde aktualisiert:</p>
      ${previewBlock(input.preview)}
      <p><a href="${input.characterUrl}">${input.characterUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle Abonnenten eines Charakters, sobald dieser Charakter einen neuen
// Mission-Log verfasst (createMissionLog-Aufrufer in
// mission-logs/_shared/contentAction.ts) — ein einzelnes, sofortiges
// Ereignis wie bei Dialog-Nachrichten, kein Sammel-Digest.
export async function sendNewMissionLogEmail(input: {
  to: string;
  name: string;
  characterName: string;
  missionTitle: string;
  logTitle: string;
  logUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Neuer Log von ${input.characterName}: "${input.logTitle}"`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>
        ${input.characterName}, den du abonniert hast, hat einen neuen
        Mission-Log in "${input.missionTitle}" verfasst: "${input.logTitle}"
      </p>
      ${previewBlock(input.preview)}
      <p><a href="${input.logUrl}">${input.logUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An die Spieler teilnehmender Charaktere beim Anlegen einer Mission
// (missionAction, missions/_shared/contentAction.ts) — die Mission wird
// bewusst NICHT automatisch abonniert (siehe mission_participants in
// schema.sql), deshalb der separate activateUrl-Link, um das Abo mit einem
// Klick nachzuholen, statt es dem Spieler zu oktroyieren.
export async function sendMissionParticipantEmail(input: {
  to: string;
  name: string;
  missionTitle: string;
  missionUrl: string;
  activateUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Neue Mission: "${input.missionTitle}"`,
    html: `
      <p>Hallo ${input.name},</p>
      <p>dein Charakter nimmt an der neuen Mission "${input.missionTitle}" teil:</p>
      ${previewBlock(input.preview)}
      <p><a href="${input.missionUrl}">${input.missionUrl}</a></p>
      <p>
        Die Mission ist noch nicht automatisch abonniert — klicke hier, um
        über Neuigkeiten benachrichtigt zu werden:
      </p>
      <p><a href="${input.activateUrl}">${input.activateUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}
