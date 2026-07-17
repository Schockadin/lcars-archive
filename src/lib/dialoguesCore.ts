// Enthält die eigentliche Dialog-Logik ohne "server-only"-Markierung, damit
// sie sowohl von der App (via dialogues.ts) als auch von
// scripts/seedExampleDialogue.ts (per tsx außerhalb von Next ausgeführt)
// importiert werden kann — exakt das gleiche Muster wie mailCore.ts/mail.ts.
import postgres from "postgres";
import sql from "@/lib/db";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getCharactersForUser } from "@/lib/characters";
import { generateUniqueArchiveEntrySlug } from "@/lib/archive";
import type { ArchiveParticipant, ArchiveLocationRef } from "@/types/archive";

// Optionaler Client-Parameter für Aufrufe innerhalb einer bestehenden
// Transaktion (regenerateDialogueContent wird sowohl standalone als auch aus
// completeDialogue/editDialogueMessage/deleteDialogueMessage heraus
// aufgerufen) — src/lib/db.ts erlaubt nur EINE Connection pro Prozess
// (max: 1), ein Aufruf über den globalen sql-Client während eine
// sql.begin()-Transaktion die einzige Connection hält, würde sonst auf eine
// nie freiwerdende Connection warten (Deadlock, siehe SqlClient-Kommentar in
// src/lib/users.ts, wo dieses Muster zuerst eingeführt wurde).
type SqlClient = postgres.ISql;

export class DialogueSlugCollisionError extends Error {}
export class DialogueClosedError extends Error {}
export class DialogueMessageNotFoundError extends Error {}
export class DialogueMessageForbiddenError extends Error {}
// Verhindert Selbstgespräche: die nächste Nachricht in einem Dialog darf
// nicht vom selben Charakter kommen wie die letzte (siehe postDialogueMessage).
export class DialogueSelfReplyError extends Error {}
// Antwort-Reservierung (siehe reserveDialogueReply/postDialogueMessage) —
// nur bei mehr als zwei Teilnehmenden relevant. Aktiv gesperrt durch eine
// andere Person.
export class DialogueLockActiveError extends Error {}
// Bei mehr als zwei Teilnehmenden muss vor dem Antworten erst per Button
// reserviert werden (siehe reserveDialogueReply) — dieser Fehler bedeutet:
// noch niemand hat sich reserviert, insbesondere nicht der Antwortende
// selbst.
export class DialogueReservationRequiredError extends Error {}

// Statischer Platzhalter für gelöschte Nachrichten — kein markdownToSafeHtml
// nötig (kein User-Input), und der eigentliche Inhalt verlässt so nie die
// Datenschicht.
const DELETED_MESSAGE_HTML = "<p><em>Nachricht wurde gelöscht.</em></p>";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

function parseParticipants(metadata: unknown): ArchiveParticipant[] {
  const parsed =
    typeof metadata === "string"
      ? (JSON.parse(metadata) as { participants?: ArchiveParticipant[] })
      : (metadata as { participants?: ArchiveParticipant[] } | null);
  return parsed?.participants ?? [];
}

export interface DialogueMessage {
  id: number;
  characterId: number | null;
  characterSlug: string | null;
  characterName: string | null;
  authorUserId: number | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

// Chronologisch (ältester zuerst). Kein unstable_cache — muss nach jeder
// neuen Nachricht sofort frisch sein (Server Actions revalidieren die Seite
// gezielt, siehe src/app/actions/dialogues.ts).
export async function getDialogueMessages(
  archiveEntryId: number,
): Promise<DialogueMessage[]> {
  const rows = await sql<
    {
      id: number;
      character_id: number | null;
      character_slug: string | null;
      character_name: string | null;
      author_user_id: number | null;
      content: string;
      created_at: string;
      edited_at: string | null;
      deleted_at: string | null;
    }[]
  >`
    SELECT
      dm.id, dm.character_id,
      c.slug AS character_slug, c.name AS character_name,
      dm.author_user_id, dm.content, dm.created_at::text AS created_at,
      dm.edited_at::text AS edited_at, dm.deleted_at::text AS deleted_at
    FROM dialogue_messages dm
    LEFT JOIN characters c ON c.id = dm.character_id
    WHERE dm.archive_entry_id = ${archiveEntryId}
    ORDER BY dm.created_at ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    characterId: r.character_id,
    characterSlug: r.character_slug,
    characterName: r.character_name,
    authorUserId: r.author_user_id,
    content: r.deleted_at ? DELETED_MESSAGE_HTML : r.content,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    deletedAt: r.deleted_at,
  }));
}

export interface CreateDialogueInput {
  title: string;
  ownCharacterId: number;
  partnerCharacterId: number;
  authorUserId: number;
  setting: string | null;
  locationSlug: string | null;
  logDate: string | null;
  tags: string[];
  bodyMarkdown: string;
  // Opt-Out des Erstellers vom Auto-Abo (siehe unten) — der
  // Gesprächspartner wird immer abonniert (kann selbst auf der
  // Dialog-Seite wieder abbestellen), da er dem Anlegen nicht zustimmen
  // konnte.
  subscribeSelf: boolean;
}

// Der Dialog selbst ist ein ganz normaler archive_entries-Eintrag der
// Kategorie 'dialogue' — gleiche metadata-Form wie Vault-Dialoge
// (participants/location/logDate/setting), damit DialogueHeader ihn
// unverändert genauso rendert. content bleibt '' und source_md NULL
// (Unterscheidungsmerkmal "kommt nicht aus dem Vault"); die eigentliche
// erste Nachricht landet in dialogue_messages.
export interface CreateDialogueResult {
  slug: string;
  // null, falls der Partner-Charakter (noch) keinem Spieler zugeordnet ist —
  // in der Praxis nie der Fall, da getCharactersWithPlayers (Partner-Picker
  // im Formular) nur Charaktere mit player_id anbietet; defensiv trotzdem
  // nullable, da die Action-Ebene den ownCharacterId/partnerCharacterId nie
  // blind vertraut (siehe createDialogueAction).
  partner: DialogueEmailTarget | null;
  fromCharacterName: string;
}

export async function createDialogue(
  input: CreateDialogueInput,
): Promise<CreateDialogueResult> {
  const slug = await generateUniqueArchiveEntrySlug(input.title);

  return sql.begin(async (tx) => {
    const [ownChar] = await tx<{ slug: string; name: string }[]>`
      SELECT slug, name FROM characters WHERE id = ${input.ownCharacterId}
    `;
    const [partnerChar] = await tx<
      {
        slug: string;
        name: string;
        player_id: number | null;
        player_email: string | null;
        player_name: string | null;
        player_email_notifications_enabled: boolean | null;
        player_push_notifications_enabled: boolean | null;
      }[]
    >`
      SELECT c.slug, c.name, c.player_id,
             u.email AS player_email, u.name AS player_name,
             u.email_notifications_enabled AS player_email_notifications_enabled,
             u.push_notifications_enabled AS player_push_notifications_enabled
      FROM characters c
      LEFT JOIN users u ON u.id = c.player_id
      WHERE c.id = ${input.partnerCharacterId}
    `;
    if (!ownChar || !partnerChar) {
      throw new Error("Charakter nicht gefunden.");
    }

    let location: ArchiveLocationRef | null = null;
    if (input.locationSlug) {
      const [loc] = await tx<{ title: string }[]>`
        SELECT title FROM archive_entries
        WHERE slug = ${input.locationSlug} AND category = 'location'
      `;
      if (loc) location = { slug: input.locationSlug, title: loc.title };
    }

    const participants: ArchiveParticipant[] = [
      { slug: ownChar.slug, name: ownChar.name, kind: "character" },
      { slug: partnerChar.slug, name: partnerChar.name, kind: "character" },
    ];

    const metadata = {
      summary: null,
      attributes: [],
      characters: [],
      missions: [],
      setting: input.setting,
      logDate: input.logDate,
      participants,
      location,
    };

    try {
      const [entry] = await tx<{ id: number }[]>`
        INSERT INTO archive_entries (
          slug, title, category, content, tags, metadata,
          source_md, frontmatter, dialogue_open, owner_user_id, updated_at
        ) VALUES (
          ${slug}, ${input.title}, 'dialogue', '', ${input.tags},
          ${tx.json(metadata as ReturnType<typeof JSON.parse>)}, NULL, ${tx.json({})}, TRUE,
          ${input.authorUserId}, NOW()
        )
        RETURNING id
      `;

      const content = await markdownToSafeHtml(input.bodyMarkdown);
      await tx`
        INSERT INTO dialogue_messages (
          archive_entry_id, character_id, author_user_id, content, source_md
        ) VALUES (
          ${entry.id}, ${input.ownCharacterId}, ${input.authorUserId},
          ${content}, ${input.bodyMarkdown}
        )
      `;

      // Beide Teilnehmer-User standardmäßig auf den Dialog abonnieren
      // (target_type='archive_entry', gleiche Tabelle wie Bookmarks/Missions-
      // /Charakter-Abos, siehe src/lib/follows.ts). Kein Import von
      // follows.ts hier (das ist "server-only", dialoguesCore.ts bewusst
      // nicht — siehe Kommentar am Dateianfang) — daher die gleiche
      // Upsert-Logik direkt inline.
      if (input.subscribeSelf) {
        await tx`
          INSERT INTO content_follows (user_id, target_type, target_slug, subscribed_at)
          VALUES (${input.authorUserId}, 'archive_entry', ${slug}, NOW())
          ON CONFLICT (user_id, target_type, target_slug)
          DO UPDATE SET subscribed_at = NOW()
        `;
      }
      if (partnerChar.player_id != null) {
        await tx`
          INSERT INTO content_follows (user_id, target_type, target_slug, subscribed_at)
          VALUES (${partnerChar.player_id}, 'archive_entry', ${slug}, NOW())
          ON CONFLICT (user_id, target_type, target_slug)
          DO UPDATE SET subscribed_at = NOW()
        `;
      }

      return {
        slug,
        partner:
          partnerChar.player_id != null &&
          partnerChar.player_email != null &&
          partnerChar.player_name != null
            ? {
                id: partnerChar.player_id,
                email: partnerChar.player_email,
                name: partnerChar.player_name,
                emailNotificationsEnabled:
                  partnerChar.player_email_notifications_enabled ?? false,
                pushNotificationsEnabled:
                  partnerChar.player_push_notifications_enabled ?? false,
              }
            : null,
        fromCharacterName: ownChar.name,
      };
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DialogueSlugCollisionError(
          "Ein Dialog mit diesem Titel wurde gerade schon angelegt. Bitte versuche es erneut.",
        );
      }
      throw err;
    }
  });
}

export interface InviteParticipantsResult {
  title: string;
  invited: DialogueEmailTarget[];
}

// Fügt weitere Charaktere zu einem Dialog hinzu — jederzeit möglich, auch
// während der Dialog noch offen ist (siehe inviteDialogueParticipantAction,
// dort auch der Owner-Only-Check). Teilnehmer bleiben ausschließlich in
// archive_entries.metadata.participants gespeichert, keine eigene Tabelle
// (siehe Kommentar am Dateianfang zu ArchiveParticipant) — die Leseseite
// (getDialogueParticipant/getDialogueParticipantPlayers) arbeitet bereits
// generisch über beliebig viele Einträge, eine zweite Tabelle wäre nur eine
// zusätzliche, potenziell auseinanderlaufende Quelle der Wahrheit. FOR
// UPDATE schützt gegen zwei gleichzeitige Einladungen, die sich sonst beim
// Read-Modify-Write auf das JSONB-Feld gegenseitig überschreiben könnten.
// Bereits teilnehmende Charaktere werden still übersprungen (kein Fehler,
// keine doppelte Mail) — Direkt-Hinzufügen ohne Annehmen/Ablehnen, wie beim
// initialen Erstellen eines Dialogs. Mail/Push für die neu Eingeladenen
// verschickt wie gewohnt die Action-Ebene, nicht diese Funktion.
export async function inviteDialogueParticipants(
  archiveEntryId: number,
  characterIds: number[],
): Promise<InviteParticipantsResult> {
  return sql.begin(async (tx) => {
    const [entry] = await tx<{ slug: string; title: string; metadata: unknown }[]>`
      SELECT slug, title, metadata FROM archive_entries
      WHERE id = ${archiveEntryId} AND category = 'dialogue'
      FOR UPDATE
    `;
    if (!entry) throw new Error("Dialog nicht gefunden.");
    if (characterIds.length === 0) return { title: entry.title, invited: [] };

    const participants = parseParticipants(entry.metadata);
    const existingSlugs = new Set(participants.map((p) => p.slug));

    const chars = await tx<
      {
        slug: string;
        name: string;
        player_id: number | null;
        player_email: string | null;
        player_name: string | null;
        player_email_notifications_enabled: boolean | null;
        player_push_notifications_enabled: boolean | null;
      }[]
    >`
      SELECT c.slug, c.name, c.player_id,
             u.email AS player_email, u.name AS player_name,
             u.email_notifications_enabled AS player_email_notifications_enabled,
             u.push_notifications_enabled AS player_push_notifications_enabled
      FROM characters c
      LEFT JOIN users u ON u.id = c.player_id
      WHERE c.id = ANY(${characterIds})
    `;
    const newChars = chars.filter((c) => !existingSlugs.has(c.slug));
    if (newChars.length === 0) return { title: entry.title, invited: [] };

    const metadata = {
      ...(typeof entry.metadata === "string"
        ? (JSON.parse(entry.metadata) as Record<string, unknown>)
        : ((entry.metadata as Record<string, unknown> | null) ?? {})),
      participants: [
        ...participants,
        ...newChars.map((c) => ({
          slug: c.slug,
          name: c.name,
          kind: "character" as const,
        })),
      ],
    };

    await tx`
      UPDATE archive_entries
      SET metadata = ${tx.json(metadata as ReturnType<typeof JSON.parse>)}, updated_at = NOW()
      WHERE id = ${archiveEntryId}
    `;

    const invited: DialogueEmailTarget[] = [];
    for (const c of newChars) {
      if (c.player_id == null) continue;
      await tx`
        INSERT INTO content_follows (user_id, target_type, target_slug, subscribed_at)
        VALUES (${c.player_id}, 'archive_entry', ${entry.slug}, NOW())
        ON CONFLICT (user_id, target_type, target_slug)
        DO UPDATE SET subscribed_at = NOW()
      `;
      if (c.player_email != null && c.player_name != null) {
        invited.push({
          id: c.player_id,
          email: c.player_email,
          name: c.player_name,
          emailNotificationsEnabled: c.player_email_notifications_enabled ?? false,
          pushNotificationsEnabled: c.player_push_notifications_enabled ?? false,
        });
      }
    }

    return { title: entry.title, invited };
  });
}

export interface PostMessageInput {
  archiveEntryId: number;
  characterId: number;
  authorUserId: number;
  bodyMarkdown: string;
}

export async function postDialogueMessage(
  input: PostMessageInput,
): Promise<DialogueMessage> {
  const content = await markdownToSafeHtml(input.bodyMarkdown);

  return sql.begin(async (tx) => {
    // Autoritativer Check innerhalb der Transaktion (FOR UPDATE) statt sich
    // auf den (möglicherweise gecachten) Aufrufer-Read zu verlassen — schützt
    // gegen den Fall, dass der andere Teilnehmer den Dialog just in diesem
    // Moment abschließt (TOCTOU). metadata wird gleich mitgeladen, um die
    // Teilnehmerzahl für den Reservierungs-Check unten zu kennen (siehe
    // parseParticipants).
    const [entry] = await tx<{ dialogue_open: boolean; metadata: unknown }[]>`
      SELECT dialogue_open, metadata FROM archive_entries
      WHERE id = ${input.archiveEntryId} FOR UPDATE
    `;
    if (!entry?.dialogue_open) {
      throw new DialogueClosedError("Dieses Gespräch ist abgeschlossen.");
    }

    // Verhindert Selbstgespräche: wer mit mehreren eigenen Charakteren
    // teilnimmt, darf nicht mit demselben Charakter zweimal hintereinander
    // antworten — die nächste Nachricht muss von einem anderen Charakter
    // kommen. Nur die letzte NICHT gelöschte Nachricht zählt.
    const [lastMessage] = await tx<{ character_id: number | null }[]>`
      SELECT character_id FROM dialogue_messages
      WHERE archive_entry_id = ${input.archiveEntryId} AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;
    if (lastMessage && lastMessage.character_id === input.characterId) {
      throw new DialogueSelfReplyError(
        "Warte, bis jemand anderes geantwortet hat, bevor du erneut schreibst.",
      );
    }

    // Antwort-Reservierung: nur relevant bei mehr als zwei Teilnehmenden
    // (siehe Kontext-Kommentar bei DialogueLockActiveError). Bei genau zwei
    // Teilnehmenden bleibt das obige Selbstgespräch-Verbot der einzige
    // Schutzmechanismus, unverändert.
    const participantCount = parseParticipants(entry.metadata).length;
    let selfReleasedReservation = false;
    if (participantCount > 2) {
      // Nur die Zeile selbst freigeben, Notify-Requests bewusst NICHT hier
      // schon benachrichtigen/löschen (siehe deleteExpiredReservationRow) —
      // dieser Codepfad lehnt die Nachricht anschließend meist sowieso ab
      // (kein/fremdes Reservierungsrecht) und postDialogueMessage kann keine
      // Benachrichtigung an die Action-Ebene zurückgeben.
      await deleteExpiredReservationRow(tx, input.archiveEntryId);
      const [reservation] = await tx<{ held_by_user_id: number }[]>`
        SELECT held_by_user_id FROM dialogue_reservations
        WHERE archive_entry_id = ${input.archiveEntryId}
      `;
      if (!reservation) {
        throw new DialogueReservationRequiredError(
          "Bitte reserviere dir zuerst per Button das Antwortrecht, bevor du antwortest.",
        );
      }
      if (reservation.held_by_user_id !== input.authorUserId) {
        throw new DialogueLockActiveError(
          "Ein anderes Mitglied hat sich gerade das Antwortrecht reserviert. Bitte warte, bis die Sperre endet.",
        );
      }
      selfReleasedReservation = true;
    }

    const [row] = await tx<
      { id: number; character_id: number | null; created_at: string }[]
    >`
      INSERT INTO dialogue_messages (
        archive_entry_id, character_id, author_user_id, content, source_md
      ) VALUES (
        ${input.archiveEntryId}, ${input.characterId}, ${input.authorUserId},
        ${content}, ${input.bodyMarkdown}
      )
      RETURNING id, character_id, created_at::text AS created_at
    `;

    // Hält getDialoguesForUser()s Sortierung nach Aktivität sinnvoll.
    await tx`
      UPDATE archive_entries SET updated_at = NOW() WHERE id = ${input.archiveEntryId}
    `;

    // Die Reservierung endet vorzeitig, sobald die reservierende Person
    // tatsächlich geantwortet hat — Notify-Requests werden dabei bewusst
    // ohne Benachrichtigung geleert (kein "Sperre endet"-Hinweis nötig, wenn
    // im selben Moment auch schon die neue Nachricht sichtbar wird), anders
    // als bei releaseExpiredDialogueReservation (Ablauf ohne Antwort).
    if (selfReleasedReservation) {
      await tx`
        DELETE FROM dialogue_reservations
        WHERE archive_entry_id = ${input.archiveEntryId} AND held_by_user_id = ${input.authorUserId}
      `;
      await tx`
        DELETE FROM dialogue_reservation_notify_requests
        WHERE archive_entry_id = ${input.archiveEntryId}
      `;
    }

    const [char] = await tx<{ slug: string; name: string }[]>`
      SELECT slug, name FROM characters WHERE id = ${input.characterId}
    `;

    return {
      id: row.id,
      characterId: row.character_id,
      characterSlug: char?.slug ?? null,
      characterName: char?.name ?? null,
      authorUserId: input.authorUserId,
      content,
      createdAt: row.created_at,
      editedAt: null,
      deletedAt: null,
    };
  });
}

export interface DialogueMessageForEdit {
  id: number;
  archiveEntryId: number;
  entrySlug: string;
  authorUserId: number | null;
  characterId: number | null;
  sourceMd: string;
  deletedAt: string | null;
}

// Reiner interner Lookup ohne eigene Auth-Prüfung — der Aufrufer (Server
// Action) muss authorUserId === session.userId selbst prüfen, bevor
// sourceMd an den Client geht.
export async function getDialogueMessageForEdit(
  messageId: number,
): Promise<DialogueMessageForEdit | null> {
  const [row] = await sql<
    {
      id: number;
      archive_entry_id: number;
      entry_slug: string;
      author_user_id: number | null;
      character_id: number | null;
      source_md: string;
      deleted_at: string | null;
    }[]
  >`
    SELECT dm.id, dm.archive_entry_id, ae.slug AS entry_slug,
           dm.author_user_id, dm.character_id, dm.source_md,
           dm.deleted_at::text AS deleted_at
    FROM dialogue_messages dm
    JOIN archive_entries ae ON ae.id = dm.archive_entry_id
    WHERE dm.id = ${messageId}
  `;
  if (!row) return null;

  return {
    id: row.id,
    archiveEntryId: row.archive_entry_id,
    entrySlug: row.entry_slug,
    authorUserId: row.author_user_id,
    characterId: row.character_id,
    sourceMd: row.source_md,
    deletedAt: row.deleted_at,
  };
}

export interface EditMessageInput {
  messageId: number;
  authorUserId: number;
  bodyMarkdown: string;
  // Admins/GMs dürfen als Moderation JEDE Nachricht in JEDEM Dialog
  // bearbeiten — auch fremde, auch nach Abschluss. Umgeht dafür sowohl den
  // Autoren- als auch den Offen-Check unten; der Aufrufer (editDialogueMessageAction)
  // ermittelt die Rolle serverseitig frisch aus der Session.
  isModerator?: boolean;
}

export async function editDialogueMessage(
  input: EditMessageInput,
): Promise<DialogueMessage> {
  const content = await markdownToSafeHtml(input.bodyMarkdown);

  return sql.begin(async (tx) => {
    const [row] = await tx<
      {
        id: number;
        archive_entry_id: number;
        character_id: number | null;
        author_user_id: number | null;
        deleted_at: string | null;
        dialogue_open: boolean;
      }[]
    >`
      SELECT dm.id, dm.archive_entry_id, dm.character_id, dm.author_user_id,
             dm.deleted_at::text AS deleted_at, ae.dialogue_open
      FROM dialogue_messages dm
      JOIN archive_entries ae ON ae.id = dm.archive_entry_id
      WHERE dm.id = ${input.messageId}
      FOR UPDATE OF dm
    `;
    if (!row) throw new DialogueMessageNotFoundError();
    if (!input.isModerator) {
      if (row.author_user_id !== input.authorUserId) {
        throw new DialogueMessageForbiddenError();
      }
      if (row.deleted_at) throw new DialogueMessageNotFoundError();
      if (!row.dialogue_open) throw new DialogueClosedError();
    } else if (row.deleted_at) {
      throw new DialogueMessageNotFoundError();
    }

    const [updated] = await tx<
      { id: number; created_at: string; edited_at: string }[]
    >`
      UPDATE dialogue_messages
      SET content = ${content}, source_md = ${input.bodyMarkdown}, edited_at = NOW()
      WHERE id = ${input.messageId}
      RETURNING id, created_at::text AS created_at, edited_at::text AS edited_at
    `;

    // Moderations-Edit an einem bereits geschlossenen Dialog: füllt den
    // Fließtext nur nach, falls für diesen Dialog noch nie einer erzeugt
    // wurde (regenerateDialogueContent überschreibt nie einen bereits
    // vorhandenen) — ein Dialog mit bereits generiertem Fließtext bleibt
    // also auch nach dieser Bearbeitung unverändert, bewusst kein
    // automatisches Resync.
    if (input.isModerator && !row.dialogue_open) {
      await regenerateDialogueContent(tx, row.archive_entry_id);
    }

    const [char] = row.character_id
      ? await tx<{ slug: string; name: string }[]>`
          SELECT slug, name FROM characters WHERE id = ${row.character_id}
        `
      : [undefined];

    return {
      id: updated.id,
      characterId: row.character_id,
      characterSlug: char?.slug ?? null,
      characterName: char?.name ?? null,
      authorUserId: row.author_user_id,
      content,
      createdAt: updated.created_at,
      editedAt: updated.edited_at,
      deletedAt: null,
    };
  });
}

export interface DeleteMessageInput {
  messageId: number;
  authorUserId: number;
  // Siehe EditMessageInput.isModerator — gleiche Bypass-Logik.
  isModerator?: boolean;
}

export async function deleteDialogueMessage(
  input: DeleteMessageInput,
): Promise<void> {
  await sql.begin(async (tx) => {
    const [row] = await tx<
      {
        archive_entry_id: number;
        author_user_id: number | null;
        deleted_at: string | null;
        dialogue_open: boolean;
      }[]
    >`
      SELECT dm.archive_entry_id, dm.author_user_id,
             dm.deleted_at::text AS deleted_at, ae.dialogue_open
      FROM dialogue_messages dm
      JOIN archive_entries ae ON ae.id = dm.archive_entry_id
      WHERE dm.id = ${input.messageId}
      FOR UPDATE OF dm
    `;
    if (!row) throw new DialogueMessageNotFoundError();
    if (!input.isModerator && row.author_user_id !== input.authorUserId) {
      throw new DialogueMessageForbiddenError();
    }
    if (row.deleted_at) return; // bereits gelöscht — idempotenter no-op
    if (!input.isModerator && !row.dialogue_open) throw new DialogueClosedError();

    await tx`UPDATE dialogue_messages SET deleted_at = NOW() WHERE id = ${input.messageId}`;
    await tx`UPDATE archive_entries SET updated_at = NOW() WHERE id = ${row.archive_entry_id}`;

    // Siehe gleicher Kommentar in editDialogueMessage — füllt den Fließtext
    // nur nach, falls noch keiner existiert; ein bereits vorhandener
    // Fließtext bleibt auch nach dieser Löschung unverändert.
    if (input.isModerator && !row.dialogue_open) {
      await regenerateDialogueContent(tx, row.archive_entry_id);
    }
  });
}

export interface DialogueLockStatus {
  heldByUserId: number;
  heldByName: string;
  expiresAt: string;
}

// Reiner Lese-Zugriff für die Anzeige (Dialog-Seite) — löst bewusst KEINE
// Aufräum-/Benachrichtigungs-Nebenwirkung aus (ein GET-Request/Seitenaufruf
// soll keine Mails verschicken). Eine abgelaufene, aber noch nicht
// aufgeräumte Zeile gilt für die Anzeige einfach als "keine aktive Sperre"
// (expires_at > NOW() in der WHERE-Klausel) — das tatsächliche Aufräumen
// (inkl. Benachrichtigung der Notify-Requests) passiert lazy beim nächsten
// Schreibzugriff, siehe releaseExpiredDialogueReservation.
export async function getDialogueLockStatus(
  archiveEntryId: number,
): Promise<DialogueLockStatus | null> {
  const [row] = await sql<
    { held_by_user_id: number; name: string; expires_at: string }[]
  >`
    SELECT r.held_by_user_id, u.name, r.expires_at::text AS expires_at
    FROM dialogue_reservations r
    JOIN users u ON u.id = r.held_by_user_id
    WHERE r.archive_entry_id = ${archiveEntryId} AND r.expires_at > NOW()
  `;
  if (!row) return null;
  return {
    heldByUserId: row.held_by_user_id,
    heldByName: row.name,
    expiresAt: row.expires_at,
  };
}

export interface ReleasedReservationInfo {
  notifyTargets: DialogueEmailTarget[];
  dialogueSlug: string;
  dialogueTitle: string;
}

// Löscht nur die abgelaufene Reservierungszeile selbst, OHNE die
// Notify-Requests anzurühren — genutzt von postDialogueMessage, das nach
// dieser Freigabe direkt selbst prüft, ob es sie neu vergeben darf, und bei
// Ablehnung (kein/fremdes Reservierungsrecht) keine Möglichkeit hat, eine
// Benachrichtigung an die Action-Ebene durchzureichen (siehe
// DialogueMessage-Rückgabetyp, der dafür nicht erweitert werden soll).
// dialogue_reservation_notify_requests bleiben deshalb hier bewusst
// bestehen — sie werden beim nächsten reserveDialogueReply-Aufruf für
// diesen Dialog (durch irgendeine Person) alsdann via
// releaseExpiredDialogueReservation nachträglich benachrichtigt, statt beim
// bloßen Ablauf-Zeitpunkt selbst spurlos gelöscht zu werden.
async function deleteExpiredReservationRow(
  client: SqlClient,
  archiveEntryId: number,
): Promise<boolean> {
  const [deleted] = await client<{ archive_entry_id: number }[]>`
    DELETE FROM dialogue_reservations
    WHERE archive_entry_id = ${archiveEntryId} AND expires_at <= NOW()
    RETURNING archive_entry_id
  `;
  return !!deleted;
}

// Räumt eine abgelaufene Reservierung weg und meldet zurück, wer laut
// dialogue_reservation_notify_requests über das Ende der Sperre informiert
// werden wollte (Mail/Push verschickt wie überall in dieser Datei erst die
// Action-Ebene, nicht dieser DB-Layer) — null, wenn nichts abgelaufen war.
// Nur von reserveDialogueReply aufgerufen (postDialogueMessage nutzt
// bewusst nur deleteExpiredReservationRow, siehe dortiger Kommentar).
// Nimmt einen SqlClient-Parameter, da der Aufrufer selbst schon in einer
// Transaktion läuft (siehe SqlClient-Kommentar am Dateianfang).
async function releaseExpiredDialogueReservation(
  client: SqlClient,
  archiveEntryId: number,
): Promise<ReleasedReservationInfo | null> {
  if (!(await deleteExpiredReservationRow(client, archiveEntryId))) return null;

  const notifyRows = await client<
    {
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM dialogue_reservation_notify_requests n
    JOIN users u ON u.id = n.user_id
    WHERE n.archive_entry_id = ${archiveEntryId}
  `;
  await client`
    DELETE FROM dialogue_reservation_notify_requests WHERE archive_entry_id = ${archiveEntryId}
  `;

  const [entry] = await client<{ slug: string; title: string }[]>`
    SELECT slug, title FROM archive_entries WHERE id = ${archiveEntryId}
  `;

  return {
    notifyTargets: notifyRows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      emailNotificationsEnabled: r.email_notifications_enabled,
      pushNotificationsEnabled: r.push_notifications_enabled,
    })),
    dialogueSlug: entry?.slug ?? "",
    dialogueTitle: entry?.title ?? "",
  };
}

export interface ReserveReplyResult {
  // Falls beim Reservieren nebenbei eine fremde, abgelaufene Reservierung
  // weggeräumt wurde: wer davon per Mail/Push informiert werden wollte
  // (siehe releaseExpiredDialogueReservation) — die Action-Ebene verschickt
  // das dann.
  released: ReleasedReservationInfo | null;
}

// Reserviert für 2 Stunden exklusiv das Antwortrecht in einem Dialog mit
// mehr als zwei Teilnehmenden (siehe reserveDialogueReplyAction für den
// Teilnehmer-Check). Sperrt die ganze Person (userId), nicht nur einen
// Charakter. ON CONFLICT ... WHERE expires_at <= NOW() würde zwar auch eine
// abgelaufene fremde Reservierung atomar ersetzen, hier trotzdem zusätzlich
// der explizite releaseExpiredDialogueReservation-Aufruf davor — nur so
// bekommen wartende Notify-Requests überhaupt ihre Benachrichtigung
// (ON CONFLICT DO UPDATE allein würde die alte Zeile stillschweigend
// überschreiben, ohne dass diese Funktion je davon erfährt).
export async function reserveDialogueReply(
  archiveEntryId: number,
  userId: number,
): Promise<ReserveReplyResult> {
  return sql.begin(async (tx) => {
    const released = await releaseExpiredDialogueReservation(tx, archiveEntryId);

    const rows = await tx<{ held_by_user_id: number }[]>`
      INSERT INTO dialogue_reservations (archive_entry_id, held_by_user_id, expires_at)
      VALUES (${archiveEntryId}, ${userId}, NOW() + INTERVAL '2 hours')
      ON CONFLICT (archive_entry_id) DO NOTHING
      RETURNING held_by_user_id
    `;
    if (rows.length === 0) {
      const [existing] = await tx<{ held_by_user_id: number; name: string }[]>`
        SELECT r.held_by_user_id, u.name
        FROM dialogue_reservations r
        JOIN users u ON u.id = r.held_by_user_id
        WHERE r.archive_entry_id = ${archiveEntryId}
      `;
      if (existing && existing.held_by_user_id !== userId) {
        throw new DialogueLockActiveError(
          `${existing.name} hat sich bereits das Antwortrecht für dieses Gespräch reserviert. Bitte warte, bis die Sperre endet.`,
        );
      }
      // existing.held_by_user_id === userId: bereits selbst reserviert — kein Fehler, no-op.
    }

    return { released };
  });
}

// Einmal-Opt-in "informiere mich, wenn die aktuelle Antwort-Sperre endet"
// (siehe dialogueReservationNotifyAction) — ON CONFLICT DO NOTHING, ein
// zweiter Klick ist ein no-op statt eines Fehlers.
export async function requestDialogueReservationNotification(
  archiveEntryId: number,
  userId: number,
): Promise<void> {
  await sql`
    INSERT INTO dialogue_reservation_notify_requests (archive_entry_id, user_id)
    VALUES (${archiveEntryId}, ${userId})
    ON CONFLICT (archive_entry_id, user_id) DO NOTHING
  `;
}

// Für die Anzeige des "Informiere mich"-Buttons (DialogueLockPanel.tsx) —
// ohne diesen Check würde der Button nach einem Seiten-Reload wieder aktiv
// erscheinen, obwohl bereits ein Opt-in besteht.
export async function hasRequestedDialogueReservationNotification(
  archiveEntryId: number,
  userId: number,
): Promise<boolean> {
  const [row] = await sql<{ archive_entry_id: number }[]>`
    SELECT archive_entry_id FROM dialogue_reservation_notify_requests
    WHERE archive_entry_id = ${archiveEntryId} AND user_id = ${userId}
  `;
  return !!row;
}

export interface DialogueParticipantInfo {
  characterId: number;
  characterSlug: string;
  characterName: string;
}

// Ist userId Inhaber eines der beiden Teilnehmer-Charaktere dieses
// Dialogs? Grundlage für den client-seitigen (nicht redirectenden) Check
// UND die serverseitige Autorisierung vor jedem Insert.
export async function getDialogueParticipant(
  archiveEntryId: number,
  userId: number,
): Promise<DialogueParticipantInfo | null> {
  const [entry] = await sql<{ metadata: unknown }[]>`
    SELECT metadata FROM archive_entries WHERE id = ${archiveEntryId}
  `;
  if (!entry) return null;

  const slugs = parseParticipants(entry.metadata).map((p) => p.slug);
  if (slugs.length === 0) return null;

  const [row] = await sql<{ id: number; slug: string; name: string }[]>`
    SELECT id, slug, name FROM characters
    WHERE slug = ANY(${slugs}) AND player_id = ${userId}
    LIMIT 1
  `;
  if (!row) return null;

  return {
    characterId: row.id,
    characterSlug: row.slug,
    characterName: row.name,
  };
}

export interface DialoguePlayEntry {
  id: number;
  slug: string;
  title: string;
  open: boolean;
  setting: string | null;
  logDate: string | null;
  participants: ArchiveParticipant[];
  location: ArchiveLocationRef | null;
  // Wer den Dialog begonnen hat (siehe createDialogue) — Grundlage für den
  // Einladen-Button (nur der Owner darf weitere Teilnehmer hinzufügen, siehe
  // inviteDialogueParticipantAction). Bleibt bei Owner-Neuzuordnung durch
  // einen Admin (setArchiveEntryOwner) aktuell, ändert aber selbst nie die
  // participants.
  ownerUserId: number | null;
}

// Ungecacht — Grundlage für /dialogues/[slug] sowie die Actions (ersetzt
// dort getArchiveEntryBySlug), da beide immer den frischen Open/Closed-
// Status brauchen.
export async function getDialogueForPlay(
  slug: string,
): Promise<DialoguePlayEntry | null> {
  const [row] = await sql<
    {
      id: number;
      slug: string;
      title: string;
      metadata: unknown;
      dialogue_open: boolean;
      owner_user_id: number | null;
    }[]
  >`
    SELECT id, slug, title, metadata, dialogue_open, owner_user_id
    FROM archive_entries
    WHERE slug = ${slug} AND category = 'dialogue'
    LIMIT 1
  `;
  if (!row) return null;

  const meta =
    typeof row.metadata === "string"
      ? (JSON.parse(row.metadata) as {
          setting?: string | null;
          logDate?: string | null;
          participants?: ArchiveParticipant[];
          location?: ArchiveLocationRef | null;
        })
      : ((row.metadata as {
          setting?: string | null;
          logDate?: string | null;
          participants?: ArchiveParticipant[];
          location?: ArchiveLocationRef | null;
        } | null) ?? {});

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    open: row.dialogue_open,
    setting: meta.setting ?? null,
    logDate: meta.logDate ?? null,
    participants: meta.participants ?? [],
    location: meta.location ?? null,
    ownerUserId: row.owner_user_id,
  };
}

// Baut aus den (nicht gelöschten) Nachrichten eines Dialogs ein
// Fließtext-Dokument — bewusst OHNE Sprecher-Zuordnung, rein narrativ
// (Nachrichtentexte chronologisch aneinandergereiht). html konkateniert die
// bereits gerenderten content-Fragmente jeder Nachricht (jedes schon
// valides <p>...</p> aus markdownToSafeHtml, kein erneutes Rendern nötig);
// markdown verbindet die source_md-Rohtexte mit Leerzeile. Gelöschte
// Nachrichten fehlen ganz (kein Platzhalter, anders als in der
// Karten-Ansicht — ein Fließtext mit "Nachricht wurde gelöscht."
// dazwischen wäre unlesbar).
async function buildDialogueFlowingText(
  client: SqlClient,
  archiveEntryId: number,
): Promise<{ html: string; markdown: string }> {
  const rows = await client<{ content: string; source_md: string }[]>`
    SELECT content, source_md FROM dialogue_messages
    WHERE archive_entry_id = ${archiveEntryId} AND deleted_at IS NULL
    ORDER BY created_at ASC
  `;
  return {
    html: rows.map((r) => r.content).join(""),
    markdown: rows.map((r) => r.source_md).join("\n\n"),
  };
}

// Schreibt den Fließtext EINMALIG in archive_entries.content/source_md —
// nur wenn dort noch nichts steht (content leer/NULL). Einmal gesetzt,
// bleibt der Fließtext für immer unangetastet, auch durch spätere Aufrufe
// (Admin bearbeitet/löscht nachträglich eine Nachricht in einem bereits
// geschlossenen Dialog, siehe editDialogueMessage/deleteDialogueMessage,
// oder der Admin-Backfill läuft ein zweites Mal) — bewusst kein
// automatisches "immer synchron halten": ein unbedingtes, wiederholbares
// UPDATE ohne Schutz gegen erneutes Ausführen ist exakt das Muster, das
// den GM-Rollen-Hochstufungs-Bug verursacht hat (siehe scripts/schema.sql-
// Kommentar zu users_role_check). Ein Admin-Edit an einem bereits
// befüllten Dialog aktualisiert den gespeicherten Fließtext deshalb NICHT
// — er füllt nur nach, wenn für diesen Dialog noch nie einer erzeugt
// wurde (z.B. ein alter, noch nicht per Backfill befüllter Dialog).
// Rückgabewert: ob tatsächlich geschrieben wurde (RETURNING-Zeile
// vorhanden) — genutzt von regenerateAllClosedDialogueContent, um nur
// echte Änderungen zu zählen. Nimmt bewusst einen Client-Parameter statt
// fest den globalen sql zu nutzen (siehe SqlClient-Kommentar oben).
export async function regenerateDialogueContent(
  client: SqlClient,
  archiveEntryId: number,
): Promise<boolean> {
  const { html, markdown } = await buildDialogueFlowingText(client, archiveEntryId);
  const rows = await client<{ id: number }[]>`
    UPDATE archive_entries SET content = ${html}, source_md = ${markdown}
    WHERE id = ${archiveEntryId} AND (content IS NULL OR content = '')
    RETURNING id
  `;
  return rows.length > 0;
}

// Admin-Backfill (/admin/scripts) für bereits geschlossene Dialoge, die vor
// Einführung des Fließtext-Features abgeschlossen wurden (oder noch keinen
// Fließtext haben) — Dialoge mit bereits vorhandenem Fließtext werden
// übersprungen (siehe regenerateDialogueContent), ein zweiter Lauf ist
// deshalb gefahrlos und meldet 0. Sequentiell statt Promise.all — max: 1
// in src/lib/db.ts erlaubt ohnehin nur eine Query gleichzeitig.
export async function regenerateAllClosedDialogueContent(): Promise<number> {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM archive_entries WHERE category = 'dialogue' AND dialogue_open = FALSE
  `;
  let updated = 0;
  for (const row of rows) {
    if (await regenerateDialogueContent(sql, row.id)) updated++;
  }
  return updated;
}

// Abschließen ist bewusst one-way (kein Wiedereröffnen) — siehe
// completeDialogueAction in src/app/actions/dialogues.ts für die
// Berechtigungsprüfung (Teilnehmer oder GM). Läuft jetzt in einer
// Transaktion, damit der Fließtext (regenerateDialogueContent) im selben
// Schritt wie das Schließen entsteht.
export async function completeDialogue(archiveEntryId: number): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE archive_entries SET dialogue_open = FALSE, updated_at = NOW()
      WHERE id = ${archiveEntryId} AND category = 'dialogue'
    `;
    await regenerateDialogueContent(tx, archiveEntryId);
  });
}

// Nur der Ersteller (owner_user_id, siehe createDialogue) darf die
// Sichtbarkeit ändern — ein fremdes/gefälschtes id trifft dann einfach 0
// Zeilen (kein separater Vorab-Check nötig, gleiches Prinzip wie
// assignCharacterToUser in src/lib/characters.ts).
export async function setDialogueVisibility(
  userId: number,
  archiveEntryId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string; title: string } | null> {
  const rows = await sql<{ slug: string; title: string }[]>`
    UPDATE archive_entries
    SET visibility = ${visibility}, updated_at = NOW()
    WHERE id = ${archiveEntryId} AND category = 'dialogue' AND owner_user_id = ${userId}
    RETURNING slug, title
  `;
  return rows[0] ?? null;
}

export interface DeletedDialogueInfo {
  slug: string;
  title: string;
  participantSlugs: string[];
}

// Admin-only Löschung (siehe deleteDialogueAction in
// src/app/actions/dialogues.ts) — kein Owner-Scoping wie bei
// setDialogueVisibility, da nur die Administration diese Action überhaupt
// aufrufen darf. dialogue_messages hängt per ON DELETE CASCADE dran (siehe
// scripts/schema.sql), timeline_events dagegen nicht (nur per
// source_type/source_slug verknüpft, gleiches Prinzip wie deleteMission in
// src/lib/missions.ts) und wird deshalb hier separat aufgeräumt.
// participantSlugs im Rückgabewert dient der Info-Mail an die beteiligten
// Spieler (getDialogueParticipantPlayers unten). deletedByUserId dient nur
// dem Löschprotokoll (content_deletions, siehe getRecentDeletions in
// recentActivity.ts) — hier immer die löschende Admin-Person.
export async function deleteDialogue(
  archiveEntryId: number,
  deletedByUserId: number,
): Promise<DeletedDialogueInfo | null> {
  return sql.begin(async (tx) => {
    const rows = await tx<
      {
        slug: string;
        title: string;
        metadata: unknown;
        visibility: string;
        owner_user_id: number | null;
      }[]
    >`
      DELETE FROM archive_entries
      WHERE id = ${archiveEntryId} AND category = 'dialogue'
      RETURNING slug, title, metadata, visibility, owner_user_id
    `;
    const row = rows[0];
    if (!row) return null;

    await tx`
      DELETE FROM timeline_events
      WHERE source_type = 'archive_entry' AND source_slug = ${row.slug}
    `;

    // Bookmarks/Abos auf den Dialog (content_follows, target_type
    // 'archive_entry' — Dialoge sind archive_entries der Kategorie
    // 'dialogue', siehe getBookmarkedContent/getUserSubscribers in
    // follows.ts) räumen sich sonst nicht auf und zeigen danach auf einen
    // nicht mehr existierenden Slug.
    await tx`
      DELETE FROM content_follows
      WHERE target_type = 'archive_entry' AND target_slug = ${row.slug}
    `;

    await tx`
      INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
      VALUES ('archive_entry', ${row.title}, ${row.visibility}, ${row.owner_user_id}, ${deletedByUserId})
    `;

    return {
      slug: row.slug,
      title: row.title,
      participantSlugs: parseParticipants(row.metadata).map((p) => p.slug),
    };
  });
}

export interface DialogueEmailTarget {
  id: number;
  email: string;
  name: string;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

// Abonnenten dieses Dialogs (subscribed_at gesetzt, target_type
// 'archive_entry'), ohne den Absender der gerade geposteten Nachricht —
// Grundlage für die Benachrichtigung in postDialogueMessageAction. Ersetzt
// getOtherParticipantContact als bedingungslosen Empfänger: nur wer
// abonniert ist (Default beim Anlegen, abbestellbar), bekommt
// Benachrichtigungen. Dialoge sind archive_entries (category='dialogue'),
// die Query prüft aber nur target_type/target_slug — funktioniert deshalb
// unverändert für JEDEN archive_entry-Slug, nicht nur offene Dialoge (siehe
// notifyArchiveEntrySubscribers in archive.ts, das diese Funktion für genau
// diesen generischen Zweck wiederverwendet statt eine eigene, identische
// Query zu duplizieren).
export async function getDialogueSubscribers(
  dialogueSlug: string,
  excludeUserId: number,
): Promise<DialogueEmailTarget[]> {
  const rows = await sql<
    {
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    WHERE cf.target_type = 'archive_entry'
      AND cf.target_slug = ${dialogueSlug}
      AND cf.subscribed_at IS NOT NULL
      AND cf.user_id != ${excludeUserId}
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    emailNotificationsEnabled: row.email_notifications_enabled,
    pushNotificationsEnabled: row.push_notifications_enabled,
  }));
}

// Abonnenten eines Charakters (subscribed_at gesetzt) — Grundlage für die
// Dialog-Abschluss-Benachrichtigung in completeDialogueAction.
export async function getCharacterSubscribers(
  characterSlug: string,
): Promise<DialogueEmailTarget[]> {
  const rows = await sql<
    {
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    WHERE cf.target_type = 'character'
      AND cf.target_slug = ${characterSlug}
      AND cf.subscribed_at IS NOT NULL
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    emailNotificationsEnabled: row.email_notifications_enabled,
    pushNotificationsEnabled: row.push_notifications_enabled,
  }));
}

// Abonnenten einer Mission (subscribed_at gesetzt, target_type 'mission') —
// Grundlage für notifyMissionSubscribers in missions.ts, gleiches Muster wie
// getCharacterSubscribers/getDialogueSubscribers oben.
export async function getMissionSubscribers(
  missionSlug: string,
  excludeUserId: number,
): Promise<DialogueEmailTarget[]> {
  const rows = await sql<
    {
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    WHERE cf.target_type = 'mission'
      AND cf.target_slug = ${missionSlug}
      AND cf.subscribed_at IS NOT NULL
      AND cf.user_id != ${excludeUserId}
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    emailNotificationsEnabled: row.email_notifications_enabled,
    pushNotificationsEnabled: row.push_notifications_enabled,
  }));
}

// Batch-Variante von getCharacterSubscribers für mehrere Charaktere in einem
// Rutsch (z.B. alle teilnehmenden Charaktere einer neu angelegten Mission,
// siehe missions/_shared/contentAction.ts) — eine Query statt einer Query
// pro Charakter, nach target_slug gruppiert zurückgegeben.
export async function getCharacterSubscribersForSlugs(
  characterSlugs: string[],
): Promise<Map<string, DialogueEmailTarget[]>> {
  if (characterSlugs.length === 0) return new Map();

  const rows = await sql<
    {
      target_slug: string;
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT cf.target_slug, u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM content_follows cf
    JOIN users u ON u.id = cf.user_id
    WHERE cf.target_type = 'character'
      AND cf.target_slug = ANY(${characterSlugs})
      AND cf.subscribed_at IS NOT NULL
  `;

  const bySlug = new Map<string, DialogueEmailTarget[]>();
  for (const row of rows) {
    const target: DialogueEmailTarget = {
      id: row.id,
      email: row.email,
      name: row.name,
      emailNotificationsEnabled: row.email_notifications_enabled,
      pushNotificationsEnabled: row.push_notifications_enabled,
    };
    const list = bySlug.get(row.target_slug);
    if (list) list.push(target);
    else bySlug.set(row.target_slug, [target]);
  }
  return bySlug;
}

// Spieler (player_id) der beteiligten Charaktere eines Dialogs — anders als
// getDialogueSubscribers/getCharacterSubscribers unabhängig von einem Abo,
// da die Info-Mail beim Löschen (deleteDialogueAction) beide tatsächlich
// beteiligten Spieler erreichen soll, nicht nur wer abonniert hat. DISTINCT
// falls jemand beide Teilnehmer-Charaktere spielt.
export async function getDialogueParticipantPlayers(
  characterSlugs: string[],
): Promise<DialogueEmailTarget[]> {
  if (characterSlugs.length === 0) return [];

  const rows = await sql<
    {
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT DISTINCT u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.slug = ANY(${characterSlugs})
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    emailNotificationsEnabled: row.email_notifications_enabled,
    pushNotificationsEnabled: row.push_notifications_enabled,
  }));
}

export interface DialogueSummary {
  id: number;
  slug: string;
  title: string;
  partnerName: string;
  updatedAt: string;
  open: boolean;
  characterSlug: string;
  characterName: string;
  visibility: "private" | "gm" | "public";
  ownerUserId: number | null;
}

// "Deine Gespräche" fürs Dashboard (scope "open", Default) bzw. "Meine
// Inhalte" (scope "all"). Fragt pro eigenem Charakter einzeln ab (gleiches
// jsonb-Containment-Muster wie getDialogueCountByParticipant in
// src/lib/archive.ts) statt eines komplexeren Multi-Charakter-JOINs — bei
// der üblichen Anzahl Charaktere pro Spieler unproblematisch, und deutlich
// weniger fehleranfällig als jsonb_build_object direkt in SQL zu bauen.
export async function getDialoguesForUser(
  userId: number,
  scope: "open" | "all" = "open",
): Promise<DialogueSummary[]> {
  const ownCharacters = await getCharactersForUser(userId);
  if (ownCharacters.length === 0) return [];
  const ownSlugs = new Set(ownCharacters.map((c) => c.slug));

  const results = new Map<string, DialogueSummary>();
  for (const character of ownCharacters) {
    const slug = character.slug;
    type DialogueRow = {
      id: number;
      slug: string;
      title: string;
      metadata: unknown;
      updated_at: string;
      dialogue_open: boolean;
      visibility: "private" | "gm" | "public";
      owner_user_id: number | null;
    };
    const rows =
      scope === "open"
        ? await sql<DialogueRow[]>`
            SELECT id, slug, title, metadata, updated_at::text AS updated_at,
                   dialogue_open, visibility, owner_user_id
            FROM archive_entries
            WHERE category = 'dialogue'
              AND metadata->'participants' @> ${sql.json([{ slug }])}
              AND dialogue_open
          `
        : await sql<DialogueRow[]>`
            SELECT id, slug, title, metadata, updated_at::text AS updated_at,
                   dialogue_open, visibility, owner_user_id
            FROM archive_entries
            WHERE category = 'dialogue'
              AND metadata->'participants' @> ${sql.json([{ slug }])}
          `;

    for (const row of rows) {
      if (results.has(row.slug)) continue;
      const partner = parseParticipants(row.metadata).find(
        (p) => !ownSlugs.has(p.slug),
      );
      results.set(row.slug, {
        id: row.id,
        slug: row.slug,
        title: row.title,
        partnerName: partner?.name ?? "Unbekannt",
        updatedAt: row.updated_at,
        open: row.dialogue_open,
        characterSlug: character.slug,
        characterName: character.name,
        visibility: row.visibility,
        ownerUserId: row.owner_user_id,
      });
    }
  }

  return [...results.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export interface PublicDialogue {
  slug: string;
  title: string;
  participantNames: string[];
}

// Öffentliche Gespräche eines Users (owner_user_id, wie bei Missionen/
// Mission-Logs/Archiv-Einträgen — siehe scripts/schema.sql) für die
// öffentliche Profilseite /users/[id] — anders als getDialoguesForUser oben
// (Session-User, gefiltert auf "eigene Charaktere als Teilnehmer") reine
// Owner-Abfrage ohne Partner-Ausschluss, da hier beide Teilnehmer angezeigt
// werden.
export async function getPublicDialoguesForUser(
  userId: number,
): Promise<PublicDialogue[]> {
  const rows = await sql<
    { slug: string; title: string; metadata: unknown }[]
  >`
    SELECT slug, title, metadata
    FROM archive_entries
    WHERE category = 'dialogue' AND owner_user_id = ${userId} AND visibility = 'public'
    ORDER BY title ASC
  `;
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    participantNames: parseParticipants(row.metadata).map((p) => p.name),
  }));
}
