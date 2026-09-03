// Enthält die eigentliche Dialog-Logik ohne "server-only"-Markierung, damit
// sie sowohl von der App (via dialogues.ts) als auch von
// scripts/seedExampleDialogue.ts (per tsx außerhalb von Next ausgeführt)
// importiert werden kann — exakt das gleiche Muster wie mailCore.ts/mail.ts.
import postgres from "postgres";
import sql from "@/lib/db";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getCharactersForUser } from "@/lib/characters";
import { generateUniqueArchiveEntrySlug } from "@/lib/archive";
import { NPC_COLOR, resolveCharacterColor } from "@/lib/characterColor";
// Fire-and-forget-Re-Embedding (RAG-Index) — nur ABGESCHLOSSENE Dialoge sind
// embedbar (siehe embeddingSync.ts). Der Import ist tsx-sicher (kein
// server-only); dialoguesCore selbst läuft ohnehin nur im react-server-
// Kontext (siehe autolink-Kette über @/lib/characters).
import {
  syncEmbeddings,
  syncEmbeddingVisibility,
  syncEmbeddingActive,
} from "@/lib/embeddingSync";
import {
  parseDialogueLogDate,
  byDialogueLogDateDesc,
} from "@/lib/dialogueSort";
import {
  sameSpeaker,
  type DialogueSpeaker,
  type SpeakerKind,
} from "@/lib/dialogueSpeaker";
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

// Ein NPC (Datenbank-Eintrag der Kategorie "npc") ist beteiligt, aber niemand wurde
// benannt, der für ihn schreibt (siehe dialogue_npc_speakers).
export class DialogueNpcSpeakerRequiredError extends Error {}

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
  // Wer spricht — ein Charakter oder ein NPC (Datenbank-Eintrag der
  // Kategorie "npc"), siehe src/lib/dialogueSpeaker.ts. null nur bei einer
  // gelöschten/verwaisten Nachricht.
  speaker: DialogueSpeaker | null;
  characterId: number | null;
  // Slug/Name/Farbe des Sprechers — unabhängig davon, ob dahinter ein
  // Charakter oder ein NPC-Eintrag steht (die Anzeige unterscheidet sie
  // nicht, nur das Ziel des Links weiß es über speaker.kind).
  characterSlug: string | null;
  characterName: string | null;
  authorUserId: number | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  // Effektive Farbe des sprechenden CHARAKTERS (aufgelöst aus dessen eigener
  // Farbwahl bzw. deterministisch aus der Charakter-ID, siehe
  // src/lib/characterColor.ts) — nur von getDialogueMessages befüllt, für die
  // Einfärbung der wörtlichen Rede im Fließtext-Modus (DialogueFlowingText.tsx)
  // sowie der Nachrichten-Karten (DialogueThread.tsx). Optional, weil die
  // optimistischen Rückgaben von postDialogueMessage/editDialogueMessage keine
  // Farbe brauchen. Hex-Farbe (#rrggbb) oder null (kein Charakter, z.B.
  // gelöschte Nachricht).
  characterColor?: string | null;
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
      npc_entry_id: number | null;
      character_slug: string | null;
      character_name: string | null;
      character_color: string | null;
      npc_slug: string | null;
      npc_name: string | null;
      author_user_id: number | null;
      content: string;
      created_at: string;
      edited_at: string | null;
      deleted_at: string | null;
    }[]
  >`
    SELECT
      dm.id, dm.character_id, dm.npc_entry_id,
      c.slug AS character_slug, c.name AS character_name,
      c.character_color AS character_color,
      n.slug AS npc_slug, n.title AS npc_name,
      dm.author_user_id, dm.content, dm.created_at::text AS created_at,
      dm.edited_at::text AS edited_at, dm.deleted_at::text AS deleted_at
    FROM dialogue_messages dm
    LEFT JOIN characters c ON c.id = dm.character_id
    LEFT JOIN archive_entries n ON n.id = dm.npc_entry_id
    WHERE dm.archive_entry_id = ${archiveEntryId}
    ORDER BY dm.created_at ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    speaker: messageSpeaker(r.character_id, r.npc_entry_id),
    characterId: r.character_id,
    characterSlug: r.character_slug ?? r.npc_slug,
    characterName: r.character_name ?? r.npc_name,
    authorUserId: r.author_user_id,
    content: r.deleted_at ? DELETED_MESSAGE_HTML : r.content,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    deletedAt: r.deleted_at,
    // Charaktere: die eigene Farbwahl (characters.character_color), sonst eine
    // aus ihrer ID abgeleitete Preset-Farbe. NPCs: einheitlich NPC_COLOR —
    // sie sind Kampagnen-Inventar und sollen sich als Gruppe von den
    // Spielercharakteren abheben, statt mit ihnen um Farben zu konkurrieren.
    // Kein Sprecher (gelöscht) → keine Farbe.
    characterColor:
      r.character_id != null
        ? resolveCharacterColor(r.character_color, r.character_id)
        : r.npc_entry_id != null
          ? NPC_COLOR
          : null,
  }));
}

// Aus den beiden Spalten der Nachricht den Sprecher bilden.
function messageSpeaker(
  characterId: number | null,
  npcEntryId: number | null,
): DialogueSpeaker | null {
  if (characterId != null) return { kind: "character", id: characterId };
  if (npcEntryId != null) return { kind: "npc", id: npcEntryId };
  return null;
}

// Sprecher der letzten NICHT gelöschten Nachricht (wer zuletzt am Zug war)
// — Grundlage für die Antwort-Berechtigung: die nächste Nachricht darf nicht
// vom selben Charakter kommen (Selbstgespräch-Verbot, siehe postDialogueMessage).
// Genutzt vom Server-Guard in reserveDialogueReplyAction. null, wenn es noch
// keine Nachricht gibt. Exakt dieselbe Sortierung wie der Self-Reply-Check.
export async function getLastDialogueSpeaker(
  archiveEntryId: number,
): Promise<DialogueSpeaker | null> {
  const [row] = await sql<
    { character_id: number | null; npc_entry_id: number | null }[]
  >`
    SELECT character_id, npc_entry_id FROM dialogue_messages
    WHERE archive_entry_id = ${archiveEntryId} AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;
  return row ? messageSpeaker(row.character_id, row.npc_entry_id) : null;
}

export interface CreateDialogueInput {
  title: string;
  // Wer das Gespräch beginnt — ein eigener Charakter oder (nur für die
  // Spielleitung) ein NPC, also ein Datenbank-Eintrag der Kategorie "npc".
  ownSpeaker: DialogueSpeaker;
  // Mindestens einer — Gespräche können bereits bei der Erstellung mehr als
  // zwei Teilnehmende haben (statt sie erst nachträglich per
  // inviteDialogueParticipants einzeln hinzuzufügen). Bei genau einem
  // Element unverändertes Verhalten zu vorher. Charaktere und NPCs sind
  // hier gleichwertig.
  partners: DialogueSpeaker[];
  authorUserId: number;
  setting: string | null;
  locationSlug: string | null;
  logDate: string | null;
  tags: string[];
  bodyMarkdown: string;
  // Wer schreibt in diesem Gespräch für die beteiligten NPCs? Ein GM-Konto,
  // das für ALLE NPCs des Gesprächs zuständig ist (siehe
  // dialogue_npc_speakers). Fehlt der Wert, gilt „niemand" — dann darf auch
  // kein NPC beteiligt sein (createDialogue wirft sonst
  // DialogueNpcSpeakerRequiredError).
  npcSpeakerUserId?: number | null;
  // Opt-Out des Erstellers vom Auto-Abo (siehe unten) — jeder
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
  // Ein Eintrag pro Partner-Charakter mit zugeordnetem Spieler — in der
  // Praxis nie leerer als die Partner-Charaktere, da getCharactersWithPlayers
  // (Partner-Picker im Formular) nur Charaktere mit player_id anbietet;
  // defensiv trotzdem gefiltert, da die Action-Ebene die IDs nie blind
  // vertraut (siehe createDialogueAction).
  partners: DialogueEmailTarget[];
  fromCharacterName: string;
  // Für die GM-Benachrichtigung (createDialogueAction) — alle beteiligten
  // Charakternamen (eigener + Partner), nicht nur der eigene wie
  // fromCharacterName.
  participantNames: string[];
}

// Charakter-Zeile samt Spieler-Kontakt — geteilt von createDialogue und
// inviteDialogueParticipants, die beide dieselben Spalten brauchen.
interface CharacterSpeakerRow {
  id: number;
  slug: string;
  name: string;
  player_id: number | null;
  player_email: string | null;
  player_name: string | null;
  player_email_notifications_enabled: boolean | null;
  player_push_notifications_enabled: boolean | null;
}

export async function createDialogue(
  input: CreateDialogueInput,
): Promise<CreateDialogueResult> {
  const slug = await generateUniqueArchiveEntrySlug(input.title);

  return sql.begin(async (tx) => {
    // Sprechende auflösen: Charaktere aus characters, NPCs aus
    // archive_entries (Kategorie "npc") — beide werden im Gespräch
    // gleichwertig behandelt, nur die Herkunft unterscheidet sich.
    const allSpeakers = [input.ownSpeaker, ...input.partners];
    const charIds = allSpeakers.filter((s) => s.kind === "character").map((s) => s.id);
    const npcIds = allSpeakers.filter((s) => s.kind === "npc").map((s) => s.id);

    const charRows = await tx<CharacterSpeakerRow[]>`
      SELECT c.id, c.slug, c.name, c.player_id,
             u.email AS player_email, u.name AS player_name,
             u.email_notifications_enabled AS player_email_notifications_enabled,
             u.push_notifications_enabled AS player_push_notifications_enabled
      FROM characters c
      LEFT JOIN users u ON u.id = c.player_id
      WHERE c.id = ANY(${charIds})
    `;
    const npcRows = await tx<{ id: number; slug: string; name: string }[]>`
      SELECT id, slug, title AS name FROM archive_entries
      WHERE id = ANY(${npcIds})
        AND category = 'npc' AND deleted_at IS NULL AND is_draft = false
    `;
    const charById = new Map(charRows.map((c) => [c.id, c]));
    const npcById = new Map(npcRows.map((n) => [n.id, n]));
    const resolved = allSpeakers.map((speaker) => {
      const row =
        speaker.kind === "character"
          ? charById.get(speaker.id)
          : npcById.get(speaker.id);
      if (!row) throw new Error("Charakter nicht gefunden.");
      return { speaker, slug: row.slug, name: row.name };
    });
    const own = resolved[0];
    const partnerChars = input.partners
      .filter((s) => s.kind === "character")
      .map((s) => charById.get(s.id))
      .filter((c): c is CharacterSpeakerRow => c != null);

    let location: ArchiveLocationRef | null = null;
    if (input.locationSlug) {
      const [loc] = await tx<{ title: string }[]>`
        SELECT title FROM archive_entries
        WHERE slug = ${input.locationSlug} AND category = 'location'
      `;
      if (loc) location = { slug: input.locationSlug, title: loc.title };
    }

    // NPCs sind Datenbank-Einträge, also kind "archive" — dieselbe
    // Unterscheidung, die ArchiveParticipant ohnehin schon kennt (das
    // Teilnehmer-Rendering verlinkt sie darüber nach /archive statt
    // /characters).
    const participants: ArchiveParticipant[] = resolved.map(
      (r): ArchiveParticipant => ({
        slug: r.slug,
        name: r.name,
        kind: r.speaker.kind === "character" ? "character" : "archive",
      }),
    );

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
          archive_entry_id, character_id, npc_entry_id, author_user_id, content, source_md
        ) VALUES (
          ${entry.id},
          ${input.ownSpeaker.kind === "character" ? input.ownSpeaker.id : null},
          ${input.ownSpeaker.kind === "npc" ? input.ownSpeaker.id : null},
          ${input.authorUserId}, ${content}, ${input.bodyMarkdown}
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
      // Jeden Partner-Spieler abonnieren — deduplizierende Menge, falls
      // jemand mit mehreren eigenen Charakteren gleichzeitig als Partner
      // ausgewählt wurde (dann nur ein Abo statt mehrerer identischer
      // Upserts).
      const partnerPlayerIds = new Set(
        partnerChars.map((p) => p.player_id).filter((id): id is number => id != null),
      );
      for (const playerId of partnerPlayerIds) {
        await tx`
          INSERT INTO content_follows (user_id, target_type, target_slug, subscribed_at)
          VALUES (${playerId}, 'archive_entry', ${slug}, NOW())
          ON CONFLICT (user_id, target_type, target_slug)
          DO UPDATE SET subscribed_at = NOW()
        `;
      }

      // Beteiligte NPCs bekommen ihren Sprecher: ein GM-Konto, das in genau
      // diesem Gespräch für sie schreibt.
      if (npcIds.length > 0) {
        const speakerUserId = input.npcSpeakerUserId ?? null;
        if (speakerUserId == null) {
          throw new DialogueNpcSpeakerRequiredError(
            "Für die beteiligten NPCs muss eine Spielleitung ausgewählt sein.",
          );
        }
        for (const npcEntryId of npcIds) {
          await tx`
            INSERT INTO dialogue_npc_speakers (archive_entry_id, npc_entry_id, user_id)
            VALUES (${entry.id}, ${npcEntryId}, ${speakerUserId})
            ON CONFLICT (archive_entry_id, npc_entry_id) DO NOTHING
          `;
        }
        // Wer die NPCs spricht, ist Teilnehmer:in und wird wie ein
        // Partner-Spieler auf das Gespräch abonniert. DO NOTHING statt
        // DO UPDATE: der einzige mögliche Konflikt ist die Zeile des
        // Erstellers von weiter oben — spricht er die NPCs selbst und hat
        // subscribeSelf abgewählt, bliebe seine Abwahl sonst nicht bestehen.
        await tx`
          INSERT INTO content_follows (user_id, target_type, target_slug, subscribed_at)
          VALUES (${speakerUserId}, 'archive_entry', ${slug}, NOW())
          ON CONFLICT (user_id, target_type, target_slug) DO NOTHING
        `;
      }

      return {
        slug,
        partners: partnerChars
          .filter(
            (p): p is typeof p & { player_id: number; player_email: string; player_name: string } =>
              p.player_id != null && p.player_email != null && p.player_name != null,
          )
          .map((p) => ({
            id: p.player_id,
            email: p.player_email,
            name: p.player_name,
            emailNotificationsEnabled: p.player_email_notifications_enabled ?? false,
            pushNotificationsEnabled: p.player_push_notifications_enabled ?? false,
          })),
        fromCharacterName: own.name,
        participantNames: resolved.map((r) => r.name),
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
  speakers: DialogueSpeaker[],
  // Wer für nachträglich eingeladene NPCs schreibt. Fehlt der Wert, dürfen
  // keine NPCs dabei sein — die Action-Ebene lässt sie dann gar nicht erst
  // zur Auswahl zu.
  npcSpeakerUserId?: number | null,
): Promise<InviteParticipantsResult> {
  return sql.begin(async (tx) => {
    const [entry] = await tx<{ slug: string; title: string; metadata: unknown }[]>`
      SELECT slug, title, metadata FROM archive_entries
      WHERE id = ${archiveEntryId} AND category = 'dialogue'
      FOR UPDATE
    `;
    if (!entry) throw new Error("Dialog nicht gefunden.");
    if (speakers.length === 0) return { title: entry.title, invited: [] };

    const participants = parseParticipants(entry.metadata);
    const existingSlugs = new Set(participants.map((p) => p.slug));

    const chars = await tx<CharacterSpeakerRow[]>`
      SELECT c.id, c.slug, c.name, c.player_id,
             u.email AS player_email, u.name AS player_name,
             u.email_notifications_enabled AS player_email_notifications_enabled,
             u.push_notifications_enabled AS player_push_notifications_enabled
      FROM characters c
      LEFT JOIN users u ON u.id = c.player_id
      WHERE c.id = ANY(${speakers.filter((s) => s.kind === "character").map((s) => s.id)})
    `;
    // is_draft = false wie in getNpcOptions (der Quelle der Auswahlliste):
    // ein Entwurf ist für niemanden außer seinem Owner sichtbar — auch nicht
    // für die Spielleitung — und darf deshalb auch nicht über diesen Weg in
    // die Teilnehmerliste eines Gesprächs geraten.
    const npcs = await tx<{ id: number; slug: string; name: string }[]>`
      SELECT id, slug, title AS name FROM archive_entries
      WHERE id = ANY(${speakers.filter((s) => s.kind === "npc").map((s) => s.id)})
        AND category = 'npc' AND deleted_at IS NULL AND is_draft = false
    `;
    const newChars = chars.filter((c) => !existingSlugs.has(c.slug));
    const newNpcs = npcs.filter((n) => !existingSlugs.has(n.slug));
    if (newChars.length === 0 && newNpcs.length === 0) {
      return { title: entry.title, invited: [] };
    }

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
        // NPCs sind Datenbank-Einträge (siehe createDialogue).
        ...newNpcs.map((n) => ({
          slug: n.slug,
          name: n.name,
          kind: "archive" as const,
        })),
      ],
    };

    await tx`
      UPDATE archive_entries
      SET metadata = ${tx.json(metadata as ReturnType<typeof JSON.parse>)}, updated_at = NOW()
      WHERE id = ${archiveEntryId}
    `;

    // NPCs unter den Neuen bekommen ihren Sprecher — dieselbe Zuordnung wie
    // beim Anlegen (siehe createDialogue), nur nachträglich.
    if (newNpcs.length > 0) {
      const speakerUserId = npcSpeakerUserId ?? null;
      if (speakerUserId == null) {
        throw new DialogueNpcSpeakerRequiredError(
          "Für einen NPC muss eine Spielleitung benannt sein, die für ihn schreibt.",
        );
      }
      for (const npc of newNpcs) {
        await tx`
          INSERT INTO dialogue_npc_speakers (archive_entry_id, npc_entry_id, user_id)
          VALUES (${archiveEntryId}, ${npc.id}, ${speakerUserId})
          ON CONFLICT (archive_entry_id, npc_entry_id) DO NOTHING
        `;
      }
      // DO NOTHING: anders als bei den neu Eingeladenen (die dem Hinzufügen
      // nicht zustimmen konnten) ist der Sprecher hier meist die einladende
      // Person selbst — hat sie das Gespräch vorher bewusst abbestellt, darf
      // ein weiterer NPC sie nicht wieder anmelden.
      await tx`
        INSERT INTO content_follows (user_id, target_type, target_slug, subscribed_at)
        VALUES (${speakerUserId}, 'archive_entry', ${entry.slug}, NOW())
        ON CONFLICT (user_id, target_type, target_slug) DO NOTHING
      `;
    }

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
  // Charakter oder NPC — wer hier schreiben darf, prüft die Action-Ebene
  // gegen getDialogueParticipantCharacters.
  speaker: DialogueSpeaker;
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
    const [lastMessage] = await tx<
      { character_id: number | null; npc_entry_id: number | null }[]
    >`
      SELECT character_id, npc_entry_id FROM dialogue_messages
      WHERE archive_entry_id = ${input.archiveEntryId} AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;
    if (
      lastMessage &&
      sameSpeaker(
        messageSpeaker(lastMessage.character_id, lastMessage.npc_entry_id),
        input.speaker,
      )
    ) {
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
      {
        id: number;
        character_id: number | null;
        npc_entry_id: number | null;
        created_at: string;
      }[]
    >`
      INSERT INTO dialogue_messages (
        archive_entry_id, character_id, npc_entry_id, author_user_id, content, source_md
      ) VALUES (
        ${input.archiveEntryId},
        ${input.speaker.kind === "character" ? input.speaker.id : null},
        ${input.speaker.kind === "npc" ? input.speaker.id : null},
        ${input.authorUserId}, ${content}, ${input.bodyMarkdown}
      )
      RETURNING id, character_id, npc_entry_id, created_at::text AS created_at
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

    const [char] =
      input.speaker.kind === "character"
        ? await tx<{ slug: string; name: string }[]>`
            SELECT slug, name FROM characters WHERE id = ${input.speaker.id}
          `
        : await tx<{ slug: string; name: string }[]>`
            SELECT slug, title AS name FROM archive_entries WHERE id = ${input.speaker.id}
          `;

    return {
      id: row.id,
      speaker: input.speaker,
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
        npc_entry_id: number | null;
        author_user_id: number | null;
        deleted_at: string | null;
        dialogue_open: boolean;
      }[]
    >`
      SELECT dm.id, dm.archive_entry_id, dm.character_id, dm.npc_entry_id,
             dm.author_user_id, dm.deleted_at::text AS deleted_at, ae.dialogue_open
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
      : row.npc_entry_id
        ? await tx<{ slug: string; name: string }[]>`
            SELECT slug, title AS name FROM archive_entries WHERE id = ${row.npc_entry_id}
          `
        : [undefined];

    return {
      id: updated.id,
      speaker: messageSpeaker(row.character_id, row.npc_entry_id),
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
  // Charakter oder NPC-Eintrag — die Antwort-Auswahl behandelt beide gleich.
  speaker: DialogueSpeaker;
  characterSlug: string;
  characterName: string;
}

// Ist userId Inhaber eines der Teilnehmer-Charaktere dieses Dialogs — oder
// spricht sie hier für einen beteiligten NPC (dialogue_npc_speakers)?
// Grundlage für den client-seitigen (nicht redirectenden) Check UND die
// serverseitige Autorisierung vor jedem Insert.
export async function getDialogueParticipant(
  archiveEntryId: number,
  userId: number,
): Promise<DialogueParticipantInfo | null> {
  const [entry] = await sql<{ metadata: unknown }[]>`
    SELECT metadata FROM archive_entries WHERE id = ${archiveEntryId}
  `;
  if (!entry) return null;

  const participants = parseParticipants(entry.metadata);
  if (participants.length === 0) return null;

  const [row] = await participantSpeakerRows(archiveEntryId, userId, participants, 1);
  if (!row) return null;

  return {
    speaker: { kind: row.kind, id: row.id },
    characterSlug: row.slug,
    characterName: row.name,
  };
}

// Eigene Teilnehmer-Charaktere UND die NPC-Einträge, für die userId in genau
// diesem Gespräch schreibt (dialogue_npc_speakers) — beides in einer Abfrage,
// da für alles Weitere (Antworten, Abschließen, Export) gleichwertig.
// Beschränkt auf die Teilnehmenden des Dialogs (slugs aus
// metadata.participants).
async function participantSpeakerRows(
  archiveEntryId: number,
  userId: number,
  participants: ArchiveParticipant[],
  limit: number | null,
): Promise<{ kind: SpeakerKind; id: number; slug: string; name: string }[]> {
  // characters und archive_entries haben GETRENNTE Slug-Namensräume: derselbe
  // Slug kann in beiden Tabellen etwas anderes bezeichnen. Deshalb wird jeder
  // Teilnehmer-Slug nur in der Tabelle gesucht, aus der er laut seinem kind
  // stammt (NPCs stehen als "archive" drin, siehe createDialogue) — sonst
  // machte ein gleichnamiger, völlig unbeteiligter Charakter dessen Spieler
  // zum Teilnehmer des Gesprächs, mit Lese-, Antwort- und Abschlussrecht.
  // Alt-Dialoge aus dem Vault, deren Teilnehmer als "unknown" gespeichert
  // sind, zählen wie bisher als Charaktere.
  const characterSlugs = participants
    .filter((p) => p.kind !== "archive")
    .map((p) => p.slug);
  const npcSlugs = participants
    .filter((p) => p.kind === "archive")
    .map((p) => p.slug);

  const rows = await sql<
    { kind: SpeakerKind; id: number; slug: string; name: string }[]
  >`
    SELECT 'character' AS kind, c.id, c.slug, c.name FROM characters c
    WHERE c.slug = ANY(${characterSlugs}) AND c.player_id = ${userId}
    UNION ALL
    SELECT 'npc' AS kind, n.id, n.slug, n.title AS name FROM archive_entries n
    JOIN dialogue_npc_speakers s
      ON s.npc_entry_id = n.id AND s.archive_entry_id = ${archiveEntryId}
    WHERE n.slug = ANY(${npcSlugs}) AND n.category = 'npc'
      AND n.deleted_at IS NULL AND s.user_id = ${userId}
    ${limit != null ? sql`LIMIT ${limit}` : sql``}
  `;
  return rows;
}

// ALLE Teilnehmer-Charaktere dieses Dialogs, die userId gehören (nicht nur der
// erste wie getDialogueParticipant) — Grundlage für die Antwort-Charakter-
// Auswahl (DialogueReplyForm): wer mit mehreren eigenen Charakteren teilnimmt,
// wählt beim Antworten, mit welchem. Reihenfolge = Teilnehmer-Reihenfolge im
// Dialog (metadata.participants), stabil für die Anzeige.
export async function getDialogueParticipantCharacters(
  archiveEntryId: number,
  userId: number,
): Promise<DialogueParticipantInfo[]> {
  const [entry] = await sql<{ metadata: unknown }[]>`
    SELECT metadata FROM archive_entries WHERE id = ${archiveEntryId}
  `;
  if (!entry) return [];

  const participants = parseParticipants(entry.metadata);
  if (participants.length === 0) return [];

  const rows = await participantSpeakerRows(
    archiveEntryId,
    userId,
    participants,
    null,
  );
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  // In Teilnehmer-Reihenfolge zurückgeben (participants behält die Reihenfolge
  // aus metadata.participants).
  return participants
    .map((p) => bySlug.get(p.slug))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({
      speaker: { kind: r.kind, id: r.id },
      characterSlug: r.slug,
      characterName: r.name,
    }));
}

// Force-Freigabe der Antwort-Reservierung durch einen Admin (siehe
// releaseDialogueReservationAction) — anders als releaseExpiredDialogueReservation
// UNBEDINGT (unabhängig von expires_at), damit eine hängengebliebene Sperre
// (jemand reserviert, kann/will aber nicht antworten) nicht bis zum Ablauf
// alle anderen blockiert. Gibt wie beim Ablauf zurück, wer laut Notify-Requests
// über das Ende informiert werden wollte (die Action-Ebene verschickt).
export async function forceReleaseDialogueReservation(
  archiveEntryId: number,
): Promise<ReleasedReservationInfo | null> {
  return sql.begin(async (tx) => {
    const [deleted] = await tx<{ archive_entry_id: number }[]>`
      DELETE FROM dialogue_reservations
      WHERE archive_entry_id = ${archiveEntryId}
      RETURNING archive_entry_id
    `;
    if (!deleted) return null;

    const notifyRows = await tx<
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
    await tx`
      DELETE FROM dialogue_reservation_notify_requests WHERE archive_entry_id = ${archiveEntryId}
    `;
    const [entry] = await tx<{ slug: string; title: string }[]>`
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
  });
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
    WHERE slug = ${slug} AND category = 'dialogue' AND deleted_at IS NULL
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
// Exportiert (statt privat), da src/lib/contentExport.ts dieselbe Funktion
// für den Markdown-Export offener Dialoge wiederverwendet (dort existiert
// noch kein source_md auf der archive_entries-Zeile selbst, siehe dortiger
// Kommentar) — identische Fließtext-Logik statt einer zweiten Kopie.
export async function buildDialogueFlowingText(
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
// vorhanden) — genutzt vom Batch-Backfill (getClosedDialogueIds +
// regenerateDialogueContentBatchAction), um nur echte Änderungen zu zählen.
// Nimmt bewusst einen Client-Parameter statt fest den globalen sql zu nutzen
// (siehe SqlClient-Kommentar oben).
//
// Erzeugt der Dialog KEINEN Fließtext (keine nicht-gelöschte Nachricht → leerer
// html-Join), wird bewusst NICHTS geschrieben und false zurückgegeben: ein
// leeres content='' würde die Zeile weiterhin als „ohne Fließtext" gelten
// lassen (content IS NULL OR content = '') und beim Batch-Backfill zu einer
// Endlosschleife führen (dieselbe Zeile käme in jedem Durchlauf erneut). So
// bleibt ein inhaltsloser Dialog schlicht auf content = NULL.
export async function regenerateDialogueContent(
  client: SqlClient,
  archiveEntryId: number,
): Promise<boolean> {
  const { html, markdown } = await buildDialogueFlowingText(client, archiveEntryId);
  if (html.length === 0) return false;
  const rows = await client<{ id: number }[]>`
    UPDATE archive_entries SET content = ${html}, source_md = ${markdown}
    WHERE id = ${archiveEntryId} AND (content IS NULL OR content = '')
    RETURNING id
  `;
  return rows.length > 0;
}

// Stabile Liste aller abgeschlossenen Dialoge (ORDER BY id) für den
// Batch-Backfill (regenerateDialogueContentBatchAction). Bewusst ALLE
// geschlossenen Dialoge, nicht nur die „ohne Fließtext": Die Menge ändert sich
// so während des Laufs nicht, weshalb der Client stabil per OFFSET durchlaufen
// kann (garantierte Terminierung — anders als bei einer schrumpfenden Auswahl,
// die bei inhaltslosen Dialogen nie leer würde). regenerateDialogueContent
// überspringt Dialoge mit bereits vorhandenem (oder leerem) Fließtext ohnehin.
export async function getClosedDialogueIds(): Promise<number[]> {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM archive_entries
    WHERE category = 'dialogue' AND dialogue_open = FALSE
    ORDER BY id ASC
  `;
  return rows.map((r) => r.id);
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
  // Erst jetzt (abgeschlossen + Fließtext erzeugt) ist der Dialog embedbar.
  syncEmbeddings("dialogue", archiveEntryId);
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
  if (rows[0]) syncEmbeddingVisibility("dialogue", archiveEntryId, visibility);
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
// aufrufen darf. Soft-Delete (deleted_at gesetzt statt DELETE) — dieselbe
// Semantik wie deleteMission in src/lib/missions.ts: bleibt in der DB,
// verschwindet aus allen Listen/der Suche/der Timeline für alle außer
// Admins und wird nach 7 Tagen vom Purge-Cronjob endgültig entfernt.
// dialogue_messages/timeline_events/content_follows werden bewusst NICHT
// sofort entfernt — ein wiederhergestellter Dialog (restoreDialogue) soll
// seinen Nachrichtenverlauf/seine Abos zurückbekommen, Bereinigung passiert
// erst beim endgültigen Purge. participantSlugs im Rückgabewert dient der
// Info-Mail an die beteiligten Spieler (getDialogueParticipantPlayers
// unten). deletedByUserId dient nur dem Löschprotokoll (content_deletions,
// siehe getRecentDeletions in recentActivity.ts) — hier immer die löschende
// Admin-Person.
export async function deleteDialogue(
  archiveEntryId: number,
  deletedByUserId: number,
): Promise<DeletedDialogueInfo | null> {
  const rows = await sql<
    {
      slug: string;
      title: string;
      metadata: unknown;
      visibility: string;
      owner_user_id: number | null;
    }[]
  >`
    UPDATE archive_entries
    SET deleted_at = NOW()
    WHERE id = ${archiveEntryId} AND category = 'dialogue' AND deleted_at IS NULL
    RETURNING slug, title, metadata, visibility, owner_user_id
  `;
  const row = rows[0];
  if (!row) return null;
  syncEmbeddingActive("dialogue", archiveEntryId, false);

  await sql`
    INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
    VALUES ('archive_entry', ${row.title}, ${row.visibility}, ${row.owner_user_id}, ${deletedByUserId})
  `;

  return {
    slug: row.slug,
    title: row.title,
    participantSlugs: parseParticipants(row.metadata).map((p) => p.slug),
  };
}

// Selbstlöschung durch den Owner (wer das Gespräch begonnen hat, Meine
// Inhalte) — Ownership per owner_user_id direkt im WHERE erzwungen, gleiches
// Prinzip wie setDialogueVisibility oben und deleteMissionLog in
// missions.ts. Kein Admin-Bypass (bleibt deleteDialogue vorbehalten) und kein
// isDraft-Guard nötig — Dialoge kennen kein Entwurf-Konzept, landen also
// immer im "gelöscht"-News-Feed wie bisher.
export async function deleteOwnDialogue(
  userId: number,
  archiveEntryId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<
    { slug: string; title: string; visibility: string }[]
  >`
    UPDATE archive_entries
    SET deleted_at = NOW()
    WHERE id = ${archiveEntryId} AND category = 'dialogue'
      AND owner_user_id = ${userId} AND deleted_at IS NULL
    RETURNING slug, title, visibility
  `;
  const row = rows[0] ?? null;
  if (row) {
    syncEmbeddingActive("dialogue", archiveEntryId, false);
    await sql`
      INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
      VALUES ('archive_entry', ${row.title}, ${row.visibility}, ${userId}, ${userId})
    `;
  }
  return row ? { slug: row.slug } : null;
}

// Macht einen weich gelöschten Dialog wieder sichtbar (Admin-Trash-Ansicht).
export async function restoreDialogue(
  archiveEntryId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries SET deleted_at = NULL
    WHERE id = ${archiveEntryId} AND category = 'dialogue' AND deleted_at IS NOT NULL
    RETURNING slug
  `;
  if (rows[0]) syncEmbeddingActive("dialogue", archiveEntryId, true);
  return rows[0] ?? null;
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
  // Optional: das Gespräch selbst. Damit kommen auch die GM-Konten dazu, die
  // hier für beteiligte NPCs schreiben (dialogue_npc_speakers) — sie sind
  // Teilnehmende wie jede andere Person, hängen aber an keinem
  // characters.player_id.
  archiveEntryId?: number,
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
  const npcRows =
    archiveEntryId == null
      ? []
      : await sql<
          {
            id: number;
            email: string;
            name: string;
            email_notifications_enabled: boolean;
            push_notifications_enabled: boolean;
          }[]
        >`
          SELECT DISTINCT u.id, u.email, u.name, u.email_notifications_enabled,
                 u.push_notifications_enabled
          FROM dialogue_npc_speakers s
          JOIN users u ON u.id = s.user_id
          WHERE s.archive_entry_id = ${archiveEntryId}
        `;
  // Map dedupliziert: wer zugleich mit einem eigenen Charakter teilnimmt und
  // einen NPC spricht, steht nur einmal in der Liste.
  const byId = new Map<number, DialogueEmailTarget>();
  for (const row of [...rows, ...npcRows]) {
    byId.set(row.id, {
      id: row.id,
      email: row.email,
      name: row.name,
      emailNotificationsEnabled: row.email_notifications_enabled,
      pushNotificationsEnabled: row.push_notifications_enabled,
    });
  }
  return [...byId.values()];
}

// Alle aktiven GM-Accounts — Grundlage für die automatische Benachrichtigung
// bei jedem neu erstellten Dialog (siehe createDialogueAction), unabhängig
// von eigener Teilnahme und ohne Opt-in (anders als notify_content_types,
// das nur Admins zur Verfügung steht und Dialoge ohnehin nicht abdeckt,
// siehe ADMIN_CONTENT_TYPE_OPTIONS in NotificationSettingsForm.tsx).
export async function getActiveGMs(
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
    SELECT id, email, name, email_notifications_enabled, push_notifications_enabled
    FROM users
    WHERE role = 'gm' AND is_active = true AND id != ${excludeUserId}
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
  // Ingame-Datum (metadata.logDate, ISO) — Sortierschlüssel der Dialog-Listen.
  logDate: string | null;
  open: boolean;
  characterSlug: string;
  characterName: string;
  visibility: "private" | "gm" | "public";
  ownerUserId: number | null;
}

// "Deine Gespräche" fürs Dashboard (scope "open", Default) bzw. "Meine
// Inhalte" (scope "all").
//
// EINE Abfrage für ALLE eigenen Charaktere statt einer pro Charakter: der
// EXISTS-Teilausdruck klappt metadata->'participants' auf und vergleicht die
// Teilnehmer-Slugs gegen ein einfaches text[]. Vorher lief hier eine Schleife
// mit je einem sequentiellen await — auf dem Dashboard (bei jedem Aufruf, da
// nicht cachebar) also so viele DB-Rundreisen, wie der Spieler Charaktere hat.
// Der Plan ist unverändert ein Index Scan über idx_archive_category mit
// nachgelagertem Filter; gebündelt fällt er nur noch einmal statt N-mal an.
//
// Bewusst NICHT `@> ANY(...::jsonb[])`: ein als Array gebundenes
// Containment-Fragment kommt in Postgres nicht als jsonb[] an, die Bedingung
// trifft dann gar nichts — still, ohne Fehler (genau so ist bei diesem Umbau
// zuerst „Gespräch Eins" aus der Dashboard-Liste verschwunden).
export async function getDialoguesForUser(
  userId: number,
  scope: "open" | "all" = "open",
): Promise<DialogueSummary[]> {
  const ownCharacters = await getCharactersForUser(userId);
  const ownSlugs = new Set(ownCharacters.map((c) => c.slug));

  const results = new Map<string, DialogueSummary>();

  if (ownCharacters.length > 0) {
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
    const ownSlugList = ownCharacters.map((c) => c.slug);
    const rows =
      scope === "open"
        ? await sql<DialogueRow[]>`
            SELECT id, slug, title, metadata, updated_at::text AS updated_at,
                   dialogue_open, visibility, owner_user_id
            FROM archive_entries
            WHERE category = 'dialogue'
              AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(metadata->'participants') AS p
                WHERE p->>'slug' = ANY(${ownSlugList})
              )
              AND dialogue_open
              AND deleted_at IS NULL
          `
        : await sql<DialogueRow[]>`
            SELECT id, slug, title, metadata, updated_at::text AS updated_at,
                   dialogue_open, visibility, owner_user_id
            FROM archive_entries
            WHERE category = 'dialogue'
              AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(metadata->'participants') AS p
                WHERE p->>'slug' = ANY(${ownSlugList})
              )
              AND deleted_at IS NULL
          `;

    for (const row of rows) {
      if (results.has(row.slug)) continue;
      const participants = parseParticipants(row.metadata);
      const participantSlugs = new Set(participants.map((p) => p.slug));
      // Wie zuvor die Schleife: der ERSTE eigene Charakter (in derselben
      // Reihenfolge), der an diesem Gespräch teilnimmt, benennt die Zeile.
      const own = ownCharacters.find((c) => participantSlugs.has(c.slug));
      if (!own) continue;
      const partner = participants.find((p) => !ownSlugs.has(p.slug));
      results.set(row.slug, {
        id: row.id,
        slug: row.slug,
        title: row.title,
        partnerName: partner?.name ?? "Unbekannt",
        updatedAt: row.updated_at,
        logDate: parseDialogueLogDate(row.metadata),
        open: row.dialogue_open,
        characterSlug: own.slug,
        characterName: own.name,
        visibility: row.visibility,
        ownerUserId: row.owner_user_id,
      });
    }
  }

  // Dazu die Gespräche, in denen diese Person für einen NPC spricht
  // (dialogue_npc_speakers) — dort gibt es keinen eigenen Charakter, über den
  // die Schleife oben laufen könnte, sie gehören aber genauso in „Deine
  // Gespräche".
  type NpcDialogueRow = {
    id: number;
    slug: string;
    title: string;
    metadata: unknown;
    updated_at: string;
    dialogue_open: boolean;
    visibility: "private" | "gm" | "public";
    owner_user_id: number | null;
    character_slug: string;
    character_name: string;
  };
  const npcRows = await sql<NpcDialogueRow[]>`
    SELECT ae.id, ae.slug, ae.title, ae.metadata,
           ae.updated_at::text AS updated_at, ae.dialogue_open,
           ae.visibility, ae.owner_user_id,
           c.slug AS character_slug, c.title AS character_name
    FROM dialogue_npc_speakers s
    JOIN archive_entries ae ON ae.id = s.archive_entry_id
    JOIN archive_entries c ON c.id = s.npc_entry_id
    WHERE s.user_id = ${userId}
      AND ae.deleted_at IS NULL
      AND (${scope === "all"} OR ae.dialogue_open)
  `;
  for (const row of npcRows) {
    if (results.has(row.slug)) continue;
    const partner = parseParticipants(row.metadata).find(
      (p) => p.slug !== row.character_slug && !ownSlugs.has(p.slug),
    );
    results.set(row.slug, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      partnerName: partner?.name ?? "Unbekannt",
      updatedAt: row.updated_at,
      logDate: parseDialogueLogDate(row.metadata),
      open: row.dialogue_open,
      characterSlug: row.character_slug,
      characterName: row.character_name,
      visibility: row.visibility,
      ownerUserId: row.owner_user_id,
    });
  }

  return [...results.values()].sort(byDialogueLogDateDesc);
}

export interface GmDialogueOverviewItem {
  id: number;
  slug: string;
  title: string;
  participantNames: string[];
  updatedAt: string;
  ownerName: string | null;
}

// ALLE offenen Dialoge, unabhängig von eigener Teilnahme — anders als
// getDialoguesForUser oben (nur Dialoge EIGENER Charaktere) Grundlage für
// die neue GM-Übersicht "Gespräche" (/gm/dialogues), damit GM/Admin auch
// Dialoge sehen, an denen sie selbst nicht beteiligt sind. Verlinkt von dort
// auf /dialogues/[slug], das Nicht-Teilnehmenden mit GM/Admin-Rolle bereits
// Lesezugriff ohne Antwortformular gewährt (siehe dort).
export async function getAllOpenDialoguesForGM(): Promise<
  GmDialogueOverviewItem[]
> {
  const rows = await sql<
    {
      id: number;
      slug: string;
      title: string;
      metadata: unknown;
      updated_at: string;
      owner_name: string | null;
    }[]
  >`
    SELECT ae.id, ae.slug, ae.title, ae.metadata, ae.updated_at::text AS updated_at,
           u.name AS owner_name
    FROM archive_entries ae
    LEFT JOIN users u ON u.id = ae.owner_user_id
    WHERE ae.category = 'dialogue' AND ae.dialogue_open AND ae.deleted_at IS NULL
    ORDER BY ae.metadata->>'logDate' DESC NULLS LAST, ae.updated_at DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    participantNames: parseParticipants(row.metadata).map((p) => p.name),
    updatedAt: row.updated_at,
    ownerName: row.owner_name,
  }));
}

// ---------------------------------------------------------------------------
// Admin-Bearbeitung der Dialog-Metadaten
// ---------------------------------------------------------------------------
// Admins dürfen die Metadaten eines Gesprächs bearbeiten (Titel, Datum,
// Schauplatz, Ort, Tags) — NICHT den eigentlichen Gesprächsverlauf (die
// Nachrichten in dialogue_messages bleiben unangetastet). Deckt offene wie
// abgeschlossene Gespräche ab (kein dialogue_open-Filter).

export interface DialogueMetadataForEdit {
  id: number;
  slug: string;
  title: string;
  setting: string | null;
  logDate: string | null;
  locationSlug: string | null;
  tags: string[];
}

function parseDialogueMeta(metadata: unknown): {
  setting: string | null;
  logDate: string | null;
  location: ArchiveLocationRef | null;
} {
  const parsed =
    typeof metadata === "string"
      ? (JSON.parse(metadata) as Record<string, unknown>)
      : ((metadata as Record<string, unknown> | null) ?? {});
  return {
    setting: (parsed.setting as string | null) ?? null,
    logDate: (parsed.logDate as string | null) ?? null,
    location: (parsed.location as ArchiveLocationRef | null) ?? null,
  };
}

// Lädt die editierbaren Metadaten eines Gesprächs (per Slug) für das
// Admin-Bearbeiten-Formular. Gibt null zurück, wenn es kein (nicht gelöschtes)
// Gespräch mit diesem Slug gibt.
export async function getDialogueMetadataForEdit(
  slug: string,
): Promise<DialogueMetadataForEdit | null> {
  const [row] = await sql<
    { id: number; slug: string; title: string; tags: string[]; metadata: unknown }[]
  >`
    SELECT id, slug, title, tags, metadata
    FROM archive_entries
    WHERE slug = ${slug} AND category = 'dialogue' AND deleted_at IS NULL
    LIMIT 1
  `;
  if (!row) return null;
  const meta = parseDialogueMeta(row.metadata);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    setting: meta.setting,
    logDate: meta.logDate,
    locationSlug: meta.location?.slug ?? null,
    tags: row.tags,
  };
}

// Schreibt die bearbeiteten Metadaten zurück. metadata wird per jsonb-||-Merge
// nur in setting/logDate/location überschrieben — participants/characters/
// missions/summary usw. bleiben erhalten. Der Ort-Slug wird (falls gesetzt)
// gegen archive_entries aufgelöst, damit auch der Titel des Ortes gespeichert
// wird (wie bei createDialogue). Gibt den Slug zurück (für die Revalidierung
// beim Aufrufer) bzw. null, wenn kein passendes Gespräch existiert.
export async function updateDialogueMetadata(
  id: number,
  input: {
    title: string;
    setting: string | null;
    logDate: string | null;
    locationSlug: string | null;
    tags: string[];
  },
): Promise<{ slug: string } | null> {
  let location: ArchiveLocationRef | null = null;
  if (input.locationSlug) {
    const [loc] = await sql<{ title: string }[]>`
      SELECT title FROM archive_entries
      WHERE slug = ${input.locationSlug} AND category = 'location'
    `;
    if (loc) location = { slug: input.locationSlug, title: loc.title };
  }

  const metadataPatch = {
    setting: input.setting,
    logDate: input.logDate,
    location,
  };

  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET title = ${input.title},
        tags = ${input.tags},
        metadata = metadata || ${sql.json(metadataPatch as ReturnType<typeof JSON.parse>)},
        updated_at = NOW()
    WHERE id = ${id} AND category = 'dialogue' AND deleted_at IS NULL
    RETURNING slug
  `;
  // Header (Titel/Schauplatz) hat sich geändert → bei abgeschlossenen
  // Dialogen neu embedden (offene liefern in embedOne null → No-op).
  if (rows[0]) syncEmbeddings("dialogue", id);
  return rows[0] ?? null;
}
