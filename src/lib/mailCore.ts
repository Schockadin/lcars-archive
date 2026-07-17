// Eigentliche Mail-Logik ohne "server-only"-Markierung, damit sie sowohl von
// der App (via mail.ts) als auch von den Ingest-Skripten (scripts/ingest/
// notify.ts, per tsx außerhalb von Next ausgeführt) importiert werden kann —
// "server-only" lässt sich nur innerhalb von Next.js' Webpack-Build auflösen
// (siehe next/dist/compiled/server-only), unter tsx/Node direkt nicht.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Alle Templates unten interpolieren User-Content (Charakter-/Mission-/
// Dialog-Titel, Anzeigenamen, Vorschau-Auszüge aus Bios/Logs) direkt in
// HTML-Mails an ANDERE User — ohne Escaping wäre z.B. ein Charaktername wie
// `<img src=x onerror=...>` ein HTML-Injection-/Phishing-Vektor gegen jeden
// Abonnenten/Gesprächspartner, der die Mail öffnet. Jeder interpolierte Wert
// (auch die serverseitig gebauten URLs, aus Konsistenzgründen) läuft daher
// durch escapeHtml().
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const activationUrl = escapeHtml(input.activationUrl);
  return sendEmail({
    to: input.to,
    subject: "Dein Zugang zum Neo Archive",
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>für dich wurde ein Zugang zum Neo Archive angelegt.</p>
      <p>
        Klicke auf den folgenden Link, um dein Konto zu aktivieren und ein
        Passwort festzulegen:
      </p>
      <p><a href="${activationUrl}">${activationUrl}</a></p>
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
  const resetUrl = escapeHtml(input.resetUrl);
  return sendEmail({
    to: input.to,
    subject: "Neues Passwort für dein Neo-Archive-Konto",
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>
        Klicke auf den folgenden Link, um ein neues Passwort für dein
        Neo-Archive-Konto festzulegen:
      </p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
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
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>
        ${escapeHtml(input.requesterName)} (${escapeHtml(input.requesterEmail)}) hat über
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
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></li>`,
    )
    .join("\n");

  return sendEmail({
    to: input.to,
    subject: "Neuigkeiten zu deinen Abos im Neo Archive",
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
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
  const dialogueUrl = escapeHtml(input.dialogueUrl);
  return sendEmail({
    to: input.to,
    subject: `Neues Gespräch: "${input.dialogueTitle}"`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>${escapeHtml(input.fromCharacterName)} hat ein neues Gespräch "${escapeHtml(input.dialogueTitle)}" mit dir begonnen:</p>
      <p><a href="${dialogueUrl}">${dialogueUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// Direkt-Hinzufügen zu einem laufenden oder bereits abgeschlossenen Dialog
// durch den Owner (siehe inviteDialogueParticipantAction) — kein
// Annehmen/Ablehnen, die Mail ist reine Info. invitedByName ist der
// Anzeigename der einladenden Person (nicht eines Charakters — Einladen ist
// eine administrative Owner-Aktion, keine In-Character-Handlung).
export async function sendDialogueInvitedEmail(input: {
  to: string;
  name: string;
  invitedByName: string;
  dialogueTitle: string;
  dialogueUrl: string;
}): Promise<SendEmailResult> {
  const dialogueUrl = escapeHtml(input.dialogueUrl);
  return sendEmail({
    to: input.to,
    subject: `Zum Gespräch "${input.dialogueTitle}" hinzugefügt`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>${escapeHtml(input.invitedByName)} hat dich zum Gespräch "${escapeHtml(input.dialogueTitle)}" hinzugefügt:</p>
      <p><a href="${dialogueUrl}">${dialogueUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle verschickt, die sich per "Informiere mich" (siehe
// requestDialogueReservationNotification) für das Ende einer
// Antwort-Sperre in einem Mehrparteien-Dialog eingetragen hatten (siehe
// releaseExpiredDialogueReservation).
export async function sendDialogueReservationEndedEmail(input: {
  to: string;
  name: string;
  dialogueTitle: string;
  dialogueUrl: string;
}): Promise<SendEmailResult> {
  const dialogueUrl = escapeHtml(input.dialogueUrl);
  return sendEmail({
    to: input.to,
    subject: `Antwort-Sperre in "${input.dialogueTitle}" aufgehoben`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>die Antwort-Sperre im Gespräch "${escapeHtml(input.dialogueTitle)}" wurde aufgehoben — du kannst jetzt antworten:</p>
      <p><a href="${dialogueUrl}">${dialogueUrl}</a></p>
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
  return `<p style="color:#666;font-style:italic;">${escapeHtml(preview)}</p>`;
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
  const dialogueUrl = escapeHtml(input.dialogueUrl);
  return sendEmail({
    to: input.to,
    subject: `Neue Nachricht in "${input.dialogueTitle}"`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>${escapeHtml(input.fromCharacterName)} hat im Gespräch "${escapeHtml(input.dialogueTitle)}" geantwortet:</p>
      ${previewBlock(input.preview)}
      <p><a href="${dialogueUrl}">${dialogueUrl}</a></p>
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
  const dialogueUrl = escapeHtml(input.dialogueUrl);
  return sendEmail({
    to: input.to,
    subject: `Gespräch mit ${input.characterName} abgeschlossen`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>das Gespräch "${escapeHtml(input.dialogueTitle)}", an dem ${escapeHtml(input.characterName)} teilgenommen hat, wurde abgeschlossen.</p>
      <p><a href="${dialogueUrl}">${dialogueUrl}</a></p>
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
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>
        das Gespräch "${escapeHtml(input.dialogueTitle)}", an dem du beteiligt warst,
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
  const characterUrl = escapeHtml(input.characterUrl);
  return sendEmail({
    to: input.to,
    subject: `Aktualisiert: ${input.characterName}`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>die Akte von ${escapeHtml(input.characterName)}, den du abonniert hast, wurde aktualisiert:</p>
      ${previewBlock(input.preview)}
      <p><a href="${characterUrl}">${characterUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle Abonnenten einer Mission (content_follows, target_type
// 'mission'), sobald diese Mission bearbeitet wird (siehe
// notifyMissionSubscribers in src/lib/missions.ts, gerufen aus
// missions/_shared/contentAction.ts). Der Bearbeitende selbst wird vom
// Aufrufer ausgeschlossen.
export async function sendMissionUpdatedEmail(input: {
  to: string;
  name: string;
  missionTitle: string;
  missionUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  const missionUrl = escapeHtml(input.missionUrl);
  return sendEmail({
    to: input.to,
    subject: `Aktualisiert: ${input.missionTitle}`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>die Mission "${escapeHtml(input.missionTitle)}", die du abonniert hast, wurde aktualisiert:</p>
      ${previewBlock(input.preview)}
      <p><a href="${missionUrl}">${missionUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle Abonnenten eines Archiv-Eintrags (content_follows, target_type
// 'archive_entry'), sobald dieser Eintrag bearbeitet wird (siehe
// notifyArchiveEntrySubscribers in src/lib/archive.ts, gerufen aus
// archive/_shared/contentAction.ts). Der Bearbeitende selbst wird vom
// Aufrufer ausgeschlossen.
export async function sendArchiveEntryUpdatedEmail(input: {
  to: string;
  name: string;
  entryTitle: string;
  entryUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  const entryUrl = escapeHtml(input.entryUrl);
  return sendEmail({
    to: input.to,
    subject: `Aktualisiert: ${input.entryTitle}`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>der Archiv-Eintrag "${escapeHtml(input.entryTitle)}", den du abonniert hast, wurde aktualisiert:</p>
      ${previewBlock(input.preview)}
      <p><a href="${entryUrl}">${entryUrl}</a></p>
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
  const logUrl = escapeHtml(input.logUrl);
  return sendEmail({
    to: input.to,
    subject: `Neuer Log von ${input.characterName}: "${input.logTitle}"`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>
        ${escapeHtml(input.characterName)}, den du abonniert hast, hat einen neuen
        Mission-Log in "${escapeHtml(input.missionTitle)}" verfasst: "${escapeHtml(input.logTitle)}"
      </p>
      ${previewBlock(input.preview)}
      <p><a href="${logUrl}">${logUrl}</a></p>
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
  const missionUrl = escapeHtml(input.missionUrl);
  const activateUrl = escapeHtml(input.activateUrl);
  return sendEmail({
    to: input.to,
    subject: `Neue Mission: "${input.missionTitle}"`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>dein Charakter nimmt an der neuen Mission "${escapeHtml(input.missionTitle)}" teil:</p>
      ${previewBlock(input.preview)}
      <p><a href="${missionUrl}">${missionUrl}</a></p>
      <p>
        Die Mission ist noch nicht automatisch abonniert — klicke hier, um
        über Neuigkeiten benachrichtigt zu werden:
      </p>
      <p><a href="${activateUrl}">${activateUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle Abonnenten eines Users (content_follows, target_type 'user'),
// sobald dieser User einen neuen öffentlichen Inhalt erstellt oder einen
// bestehenden auf public umstellt (notifyUserSubscribers in
// src/lib/follows.ts, aufgerufen aus setVisibilityAction in
// user/[id]/content/actions.ts bzw. den jeweiligen Anlage-Actions) — ein
// einzelnes, sofortiges Ereignis wie bei Charakter-/Mission-Log-Abos, kein
// Sammel-Digest.
export async function sendUserContentEmail(input: {
  to: string;
  name: string;
  authorName: string;
  contentTypeLabel: string;
  contentTitle: string;
  contentUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  const contentUrl = escapeHtml(input.contentUrl);
  return sendEmail({
    to: input.to,
    subject: `Neuer öffentlicher Inhalt von ${input.authorName}: "${input.contentTitle}"`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>
        ${escapeHtml(input.authorName)}, den/die du abonniert hast, hat ${escapeHtml(input.contentTypeLabel)}
        veröffentlicht: "${escapeHtml(input.contentTitle)}"
      </p>
      ${previewBlock(input.preview)}
      <p><a href="${contentUrl}">${contentUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle Abonnenten eines teilnehmenden Charakters (content_follows,
// target_type 'character'), wenn dessen Mission neu angelegt wird (siehe
// missionAction, missions/_shared/contentAction.ts) — zusätzlich zur
// direkten Benachrichtigung des Spielers selbst (sendMissionParticipantEmail
// oben). Schließt den Spieler des Charakters aus, der die direkte Mail
// bereits bekommt.
export async function sendCharacterMissionParticipationEmail(input: {
  to: string;
  name: string;
  characterName: string;
  missionTitle: string;
  missionUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  const missionUrl = escapeHtml(input.missionUrl);
  return sendEmail({
    to: input.to,
    subject: `${input.characterName} ist jetzt Teil von „${input.missionTitle}"`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>
        ${escapeHtml(input.characterName)}, den du abonniert hast, nimmt jetzt an der
        Mission „${escapeHtml(input.missionTitle)}" teil:
      </p>
      ${previewBlock(input.preview)}
      <p><a href="${missionUrl}">${missionUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}

// An alle Abonnenten des Users, dem ein teilnehmender Charakter gehört
// (content_follows, target_type 'user'), wenn dessen Mission neu angelegt
// wird — gleiches Ereignis wie sendCharacterMissionParticipationEmail oben,
// nur für Userabos statt Charakterabos. Schließt ebenfalls den Spieler
// selbst aus.
export async function sendUserMissionParticipationEmail(input: {
  to: string;
  name: string;
  authorName: string;
  characterName: string;
  missionTitle: string;
  missionUrl: string;
  preview: string;
}): Promise<SendEmailResult> {
  const missionUrl = escapeHtml(input.missionUrl);
  return sendEmail({
    to: input.to,
    subject: `${input.authorName}s Charakter ${input.characterName} ist jetzt Teil von „${input.missionTitle}"`,
    html: `
      <p>Hallo ${escapeHtml(input.name)},</p>
      <p>
        ${escapeHtml(input.authorName)}, den/die du abonniert hast, spielt mit
        ${escapeHtml(input.characterName)} jetzt in der Mission „${escapeHtml(input.missionTitle)}" mit:
      </p>
      ${previewBlock(input.preview)}
      <p><a href="${missionUrl}">${missionUrl}</a></p>
      <p>— Neo Archive</p>
    `,
  });
}
