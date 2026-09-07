import "server-only";
import { markdownToHtml } from "@/lib/markdown";
import postgres from "postgres";
import sql from "@/lib/db";
import type { ApReason } from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import type { AdvancementRules } from "@/lib/advancement";

// Client-Parameter für Aufrufe innerhalb einer bestehenden Transaktion —
// dasselbe Muster wie in src/lib/users.ts und src/lib/dialoguesCore.ts.
type SqlClient = postgres.ISql;

// Gespielte Sessions (Tabelle game_sessions, siehe scripts/schema.sql). Beim
// Anlegen schreibt die Spielleitung den beteiligten Charakteren die Session-AP
// und optionale Bonus-AP gut; die Gutschriften sind normale Buchungen in
// character_ap_entries mit Rückverweis auf die Session.
//
// Ungecacht: die Seite /gm/sessions zeigt sie unmittelbar nach dem Anlegen an,
// und der Kontostand der Charaktere muss sofort stimmen.

export interface GameSession {
  id: number;
  sessionDate: string;
  title: string;
  sessionAp: number;
  bonusAp: number;
  // Rohtext (Markdown), wie er gespeichert ist — das Formular arbeitet damit.
  notes: string;
  // Derselbe Text als bereinigtes HTML für die zusammengeklappte Vorschau.
  notesHtml: string;
  createdByName: string | null;
  createdAt: string;
  // Wie vielen Charakteren wurde gutgeschrieben und wie viele AP insgesamt.
  characterCount: number;
  totalAp: number;
  // Wie viele Logbücher an dieser Session hängen (siehe
  // syncSessionLogbookAp): ab dem ersten gibt es die Logbuch-AP automatisch.
  logbookCount: number;
  // Wem sie gutgeschrieben wurde — das Bearbeiten-Formular hakt daraus seine
  // Teilnehmer-Auswahl vor.
  characterIds: number[];
}

export async function listGameSessions(): Promise<GameSession[]> {
  const rows = await sql<Omit<GameSession, "notesHtml">[]>`
    SELECT s.id,
           s.session_date::text AS "sessionDate",
           s.title, s.session_ap AS "sessionAp", s.bonus_ap AS "bonusAp",
           s.notes,
           u.name AS "createdByName",
           s.created_at::text AS "createdAt",
           COALESCE(p.character_count, 0)::int AS "characterCount",
           COALESCE(p.character_ids, ARRAY[]::int[]) AS "characterIds",
           COALESCE(e.total_ap, 0)::int AS "totalAp",
           COALESCE(l.logbook_count, 0)::int AS "logbookCount"
    FROM game_sessions s
    LEFT JOIN users u ON u.id = s.created_by
    LEFT JOIN (
      SELECT session_id, SUM(amount) AS total_ap
      FROM character_ap_entries
      WHERE session_id IS NOT NULL
      GROUP BY session_id
    ) e ON e.session_id = s.id
    LEFT JOIN (
      SELECT session_id, COUNT(*) AS character_count,
             ARRAY_AGG(character_id) AS character_ids
      FROM game_session_characters
      GROUP BY session_id
    ) p ON p.session_id = s.id
    LEFT JOIN (
      SELECT session_id, COUNT(*) AS logbook_count
      FROM mission_logs
      WHERE session_id IS NOT NULL AND deleted_at IS NULL
      GROUP BY session_id
    ) l ON l.session_id = s.id
    ORDER BY s.session_date DESC, s.id DESC
  `;

  // Notizen sind Markdown; für die zusammengeklappte Vorschau in
  // /gm/sessions wird daraus HTML. Die Liste ist kurz (eine Kampagne hat
  // Dutzende Sessions, nicht Tausende).
  const html = await Promise.all(rows.map((r) => markdownToHtml(r.notes)));
  return rows.map((r, index) => ({ ...r, notesHtml: html[index] }));
}

// Charaktere, denen eine Session gutgeschrieben werden kann: aktive, nicht
// gelöschte Spielercharaktere. Ohne verknüpften Account (NPCs der
// Spielleitung) gibt es niemanden, der die AP ausgeben könnte — deshalb
// player_id NOT NULL. Entwürfe bleiben ebenfalls außen vor.
export interface ActiveCharacter {
  id: number;
  name: string;
  playerName: string | null;
}

export async function listActiveCharactersForAp(): Promise<ActiveCharacter[]> {
  return sql<ActiveCharacter[]>`
    SELECT c.id, c.name, u.name AS "playerName"
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.deleted_at IS NULL
      AND c.is_draft = false
      AND c.status = 'active'
    ORDER BY c.name
  `;
}

export interface CreateGameSessionInput {
  sessionDate: string;
  title: string;
  sessionAp: number;
  bonusAp: number;
  notes: string;
  characterIds: number[];
  createdByUserId: number;
}

// Session anlegen UND die Gutschriften buchen — in EINER Transaktion, damit
// keine Session ohne ihre AP (oder AP ohne ihre Session) zurückbleibt.
// Session- und Bonus-AP werden als getrennte Buchungen geführt, damit im
// Journal später erkennbar bleibt, was Grundvergabe und was Bonus war.
export async function createGameSession(
  input: CreateGameSessionInput,
): Promise<number> {
  return sql.begin(async (tx) => {
    const [session] = await tx<{ id: number }[]>`
      INSERT INTO game_sessions (session_date, title, session_ap, bonus_ap, notes, created_by)
      VALUES (${input.sessionDate}, ${input.title}, ${input.sessionAp},
              ${input.bonusAp}, ${input.notes}, ${input.createdByUserId})
      RETURNING id
    `;

    // Teilnehmende festhalten — auch wenn es (noch) keine AP gibt: die
    // automatische Logbuch-AP braucht später diese Liste.
    for (const characterId of input.characterIds) {
      await tx`
        INSERT INTO game_session_characters (session_id, character_id)
        VALUES (${session.id}, ${characterId})
        ON CONFLICT DO NOTHING
      `;
    }

    const note = input.title.trim() || `Session vom ${input.sessionDate}`;
    const bookings: { amount: number; reason: ApReason }[] = [];
    if (input.sessionAp > 0)
      bookings.push({ amount: input.sessionAp, reason: "session" });
    if (input.bonusAp > 0)
      bookings.push({ amount: input.bonusAp, reason: "bonus" });

    for (const characterId of input.characterIds) {
      for (const booking of bookings) {
        await tx`
          INSERT INTO character_ap_entries
            (character_id, amount, reason, note, created_by, session_id)
          VALUES (${characterId}, ${booking.amount}, ${booking.reason},
                  ${note}, ${input.createdByUserId}, ${session.id})
        `;
      }
    }

    return session.id;
  });
}

// Session zurücknehmen. Die Gutschriften verschwinden per ON DELETE CASCADE
// mit — sonst bliebe Guthaben aus einer nie gespielten Session stehen.
// Bereits ausgegebene AP holt das nicht zurück; der Kontostand kann dadurch
// rechnerisch negativ werden, was die Spielleitung im Journal sieht und mit
// einer Korrekturbuchung geradeziehen kann.
export async function deleteGameSession(id: number): Promise<boolean> {
  const rows =
    await sql`DELETE FROM game_sessions WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// Eine eingetragene Session vollständig korrigieren: Datum, Titel, AP-Beträge,
// Notizen und Teilnehmende. Die Gutschriften der Session werden dabei neu
// geschrieben statt fortgeschrieben — die alten `session`- und `bonus`-
// Buchungen dieser Session fallen weg, die neuen entstehen aus den frischen
// Beträgen und der frischen Teilnehmerliste. Das ist der einzige Weg, der
// Session und Konten garantiert deckungsgleich hält; eine Differenzrechnung
// müsste raten, welche Buchung zu welchem Betrag gehörte.
//
// Buchungen mit anderem Grund bleiben unangetastet: die automatischen
// Logbuch-AP zieht syncSessionLogbookAp am Ende nach (ein Charakter, der neu
// dazukommt, bekommt sie; wer herausfällt, verliert sie), und freie
// Korrekturbuchungen der Spielleitung gehören ohnehin nicht zur Session.
//
// Alles in EINER Transaktion — eine halb umgebuchte Session wäre schlimmer
// als eine unveränderte.
export interface UpdateGameSessionInput {
  id: number;
  sessionDate: string;
  title: string;
  sessionAp: number;
  bonusAp: number;
  notes: string;
  characterIds: number[];
  actingUserId: number;
}

export async function updateGameSession(
  input: UpdateGameSessionInput,
): Promise<boolean> {
  // Vor der Transaktion laden: src/lib/db.ts hält nur EINE Connection, eine
  // Abfrage über den globalen Client währenddessen würde blockieren.
  const rules = await getAdvancementRules();

  return sql.begin(async (tx) => {
    const rows = await tx<{ id: number }[]>`
      UPDATE game_sessions
      SET session_date = ${input.sessionDate}, title = ${input.title},
          session_ap = ${input.sessionAp}, bonus_ap = ${input.bonusAp},
          notes = ${input.notes}, updated_at = NOW()
      WHERE id = ${input.id}
      RETURNING id
    `;
    if (rows.length === 0) return false;

    // Teilnehmerliste neu setzen.
    await tx`
      DELETE FROM game_session_characters
      WHERE session_id = ${input.id}
        AND NOT (character_id = ANY(${input.characterIds.length > 0 ? input.characterIds : [0]}::int[]))
    `;
    for (const characterId of input.characterIds) {
      await tx`
        INSERT INTO game_session_characters (session_id, character_id)
        VALUES (${input.id}, ${characterId})
        ON CONFLICT DO NOTHING
      `;
    }

    // Gutschriften der Session neu schreiben.
    await tx`
      DELETE FROM character_ap_entries
      WHERE session_id = ${input.id} AND reason IN ('session', 'bonus')
    `;

    const note = input.title.trim() || `Session vom ${input.sessionDate}`;
    const bookings: { amount: number; reason: ApReason }[] = [];
    if (input.sessionAp > 0)
      bookings.push({ amount: input.sessionAp, reason: "session" });
    if (input.bonusAp > 0)
      bookings.push({ amount: input.bonusAp, reason: "bonus" });

    for (const characterId of input.characterIds) {
      for (const booking of bookings) {
        await tx`
          INSERT INTO character_ap_entries
            (character_id, amount, reason, note, created_by, session_id)
          VALUES (${characterId}, ${booking.amount}, ${booking.reason},
                  ${note}, ${input.actingUserId}, ${input.id})
        `;
      }
    }

    // Logbuch-AP an die neue Teilnehmerliste angleichen (idempotent).
    await syncSessionLogbookAp(input.id, input.actingUserId, rules, tx);

    return true;
  });
}

// ── Logbücher an Sessions ──────────────────────────────────────────────
// Ein Logbuch (mission_log) kann zu einer Session gehören. Sobald mindestens
// eines an einer Session hängt, bekommen die Charaktere, denen diese Session
// gutgeschrieben wurde, automatisch zusätzlich die Logbuch-AP — genau EINMAL
// je Session und Charakter, egal wie viele Logbücher geschrieben werden.

export interface SessionLogbook {
  id: number;
  slug: string;
  title: string;
  logDate: string | null;
  missionTitle: string;
  authorName: string | null;
  // An welcher Session das Logbuch hängt (null = an keiner).
  sessionId: number | null;
}

// Logbücher für die Zuordnung — die jüngsten, mit ihrer aktuellen Session (oder
// null). Die Oberfläche zeigt je Session daraus die eigenen und die noch
// freien; ein Logbuch, das schon an einer ANDEREN Session hängt, taucht dort
// nicht auf. Begrenzt, weil ältere Logs für eine neue Session praktisch nicht
// mehr in Frage kommen und die Auswahlliste nur zumüllen würden.
export async function listAssignableLogbooks(
  limit = 100,
): Promise<SessionLogbook[]> {
  return sql<SessionLogbook[]>`
    SELECT l.id, l.slug, l.title, l.log_date::text AS "logDate",
           m.title AS "missionTitle",
           c.name AS "authorName",
           l.session_id AS "sessionId"
    FROM mission_logs l
    JOIN missions m ON m.id = l.mission_id
    LEFT JOIN characters c ON c.id = l.author_id
    WHERE l.deleted_at IS NULL
      AND l.is_draft = false
    ORDER BY l.log_date DESC NULLS LAST, l.id DESC
    LIMIT ${limit}
  `;
}

// Setzt die Logbuch-Zuordnung einer Session auf genau diese Liste und zieht
// die automatische Logbuch-AP nach.
//
// Alles in EINER Transaktion: Lösen, Zuordnen und die AP-Buchungen gehören
// zusammen — bricht etwas dazwischen ab, stünde sonst die Zuordnung ohne ihre
// Gutschrift da (oder umgekehrt).
//
// Ein Logbuch kann nur an EINER Session hängen. Wird eines aus einer anderen
// Session hierher gezogen, verliert jene es — ihre Logbuch-AP muss deshalb
// mitgezogen werden, sonst behielte sie Buchungen für Logbücher, die sie gar
// nicht mehr hat. Die Regelwerks-Abfrage läuft VOR der Transaktion (sonst
// wartete sie auf die einzige Connection, siehe getAdvancementRules).
export async function setSessionLogbooks(
  sessionId: number,
  logIds: number[],
  actingUserId: number,
): Promise<void> {
  const rules = await getAdvancementRules();

  await sql.begin(async (tx) => {
    // Welche anderen Sessions verlieren hier ein Logbuch? Vor dem UPDATE
    // ermitteln — danach steht die alte Zuordnung nicht mehr in der Tabelle.
    const affected =
      logIds.length > 0
        ? await tx<{ sessionId: number }[]>`
            SELECT DISTINCT session_id AS "sessionId" FROM mission_logs
            WHERE id = ANY(${logIds}::int[])
              AND session_id IS NOT NULL AND session_id <> ${sessionId}
          `
        : [];

    await tx`
      UPDATE mission_logs SET session_id = NULL
      WHERE session_id = ${sessionId}
        AND NOT (id = ANY(${logIds.length > 0 ? logIds : [0]}::int[]))
    `;
    if (logIds.length > 0) {
      await tx`
        UPDATE mission_logs SET session_id = ${sessionId}
        WHERE id = ANY(${logIds}::int[]) AND deleted_at IS NULL
      `;
    }

    await syncSessionLogbookAp(sessionId, actingUserId, rules, tx);
    for (const row of affected) {
      await syncSessionLogbookAp(row.sessionId, actingUserId, rules, tx);
    }
  });
}

// Bringt die automatischen Logbuch-Buchungen einer Session in den Stand, den
// ihre Logbücher vorgeben: mindestens ein Logbuch → je gutgeschriebenem
// Charakter genau eine Buchung; kein Logbuch mehr → keine.
//
// Idempotent und darum gefahrlos mehrfach aufrufbar (nach dem Verknüpfen, nach
// dem Löschen eines Logs, nach dem Ändern der Teilnehmenden). Die Buchungen
// tragen reason 'logbook' und die session_id — daran erkennt die Funktion die
// bereits gebuchten Charaktere wieder.
export async function syncSessionLogbookAp(
  sessionId: number,
  actingUserId: number,
  // Vorgeladenes Regelwerk und Transaktions-Client für Aufrufe aus einer
  // offenen Transaktion heraus (setSessionLogbooks) — src/lib/db.ts hält nur
  // EINE Connection (max: 1), eine Abfrage über den globalen Client während
  // einer laufenden sql.begin()-Transaktion würde auf eine nie freiwerdende
  // Connection warten. Ohne beide Argumente unverändertes Verhalten.
  presetRules?: AdvancementRules,
  client?: SqlClient,
): Promise<{ added: number; removed: number }> {
  const db = client ?? sql;
  const rules = presetRules ?? (await getAdvancementRules());

  const [counts] = await db<{ logbooks: number }[]>`
    SELECT COUNT(*)::int AS logbooks
    FROM mission_logs
    WHERE session_id = ${sessionId} AND deleted_at IS NULL
  `;
  const hasLogbook = (counts?.logbooks ?? 0) > 0;

  if (!hasLogbook || rules.apPerLogbook <= 0) {
    const removed = await db`
      DELETE FROM character_ap_entries
      WHERE session_id = ${sessionId} AND reason = 'logbook'
      RETURNING id
    `;
    return { added: 0, removed: removed.length };
  }

  // Gutgeschrieben bekommt, wer bei der Session dabei war und noch keine
  // Logbuch-Buchung für sie hat.
  const added = await db`
    INSERT INTO character_ap_entries
      (character_id, amount, reason, note, created_by, session_id)
    SELECT p.character_id, ${rules.apPerLogbook}, 'logbook',
           'Logbuch zur Session', ${actingUserId}, ${sessionId}
    FROM game_session_characters p
    WHERE p.session_id = ${sessionId}
      AND NOT EXISTS (
        SELECT 1 FROM character_ap_entries x
        WHERE x.session_id = ${sessionId}
          AND x.reason = 'logbook'
          AND x.character_id = p.character_id
      )
    RETURNING id
  `;
  return { added: added.length, removed: 0 };
}

// Nach dem Löschen/Wiederherstellen eines Logbuchs die automatische Logbuch-AP
// seiner Session nachziehen — verliert eine Session ihr letztes Logbuch, fällt
// die Gutschrift wieder weg; kommt es zurück, kommt sie wieder. Ohne Session
// am Logbuch ist das ein No-op.
export async function resyncSessionLogbookApForLog(
  logId: number,
  actingUserId: number,
): Promise<void> {
  const [row] = await sql<{ sessionId: number | null }[]>`
    SELECT session_id AS "sessionId" FROM mission_logs WHERE id = ${logId}
  `;
  if (row?.sessionId) await syncSessionLogbookAp(row.sessionId, actingUserId);
}

// ── Missionsabschluss ──────────────────────────────────────────────────
// AP für einen Missionsabschluss gibt es nur über die Mission selbst: sie wird
// dabei auf 'completed' gesetzt. Das hält den Status der Mission und die
// Gutschrift zusammen — vorher war der Grund „Mission" eine freie Buchung, bei
// der die Mission selbst offen stehen bleiben konnte.

export interface CompletableMission {
  id: number;
  slug: string;
  title: string;
  status: string;
  // Wurde für diese Mission schon einmal AP vergeben? Dann warnt die
  // Oberfläche vor der zweiten Gutschrift.
  apAwarded: number;
}

export async function listCompletableMissions(): Promise<CompletableMission[]> {
  return sql<CompletableMission[]>`
    SELECT m.id, m.slug, m.title, m.status,
           COALESCE(a.ap, 0)::int AS "apAwarded"
    FROM missions m
    LEFT JOIN (
      SELECT mission_id, SUM(amount) AS ap
      FROM character_ap_entries
      WHERE mission_id IS NOT NULL
      GROUP BY mission_id
    ) a ON a.mission_id = m.id
    WHERE m.deleted_at IS NULL AND m.is_draft = false
    ORDER BY m.status = 'completed', m.started_at DESC NULLS LAST, m.id DESC
  `;
}

export type CompleteMissionResult =
  | { ok: true; slug: string; title: string; characterCount: number }
  | { ok: false; error: string };

// Mission abschließen und dafür AP vergeben — Statuswechsel und Buchungen in
// EINER Transaktion, damit nicht die eine Hälfte ohne die andere stehen bleibt.
export async function completeMissionWithAp(input: {
  missionId: number;
  amount: number;
  characterIds: number[];
  note: string | null;
  createdByUserId: number;
}): Promise<CompleteMissionResult> {
  return sql.begin(async (tx) => {
    const rows = await tx<{ slug: string; title: string }[]>`
      UPDATE missions
      SET status = 'completed', ended_at = COALESCE(ended_at, CURRENT_DATE),
          updated_at = NOW()
      WHERE id = ${input.missionId} AND deleted_at IS NULL
      RETURNING slug, title
    `;
    const mission = rows[0];
    if (!mission)
      return { ok: false as const, error: "Mission nicht gefunden." };

    if (input.amount > 0) {
      for (const characterId of input.characterIds) {
        await tx`
          INSERT INTO character_ap_entries
            (character_id, amount, reason, note, created_by, mission_id)
          VALUES (${characterId}, ${input.amount}, 'mission',
                  ${input.note ?? mission.title}, ${input.createdByUserId},
                  ${input.missionId})
        `;
      }
    }

    return {
      ok: true as const,
      slug: mission.slug,
      title: mission.title,
      characterCount: input.amount > 0 ? input.characterIds.length : 0,
    };
  });
}
