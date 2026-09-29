import "server-only";
import { renderContentHtml } from "@/lib/autolink";
import postgres from "postgres";
import sql from "@/lib/db";
import type { ApReason } from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import {
  buildMissionSynopsisMarkdown,
  type SessionSynopsisBlockInput,
} from "@/lib/sessionSynopsis";
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
  missionId: number | null;
  missionTitle: string | null;
  missionSlug: string | null;
  missionSessionNumber: number | null;
  sessionAp: number;
  bonusAp: number;
  createdByName: string | null;
  createdAt: string;
  // Wie vielen Charakteren wurde gutgeschrieben und wie viele AP insgesamt.
  characterCount: number;
  totalAp: number;
  // Wem sie gutgeschrieben wurde — das Bearbeiten-Formular hakt daraus seine
  // Teilnehmer-Auswahl vor.
  characterIds: number[];
  synopsisBlocks: GameSessionSynopsisBlock[];
}

export interface GameSessionSynopsisBlock extends SessionSynopsisBlockInput {
  id: number;
  blockOrder: number;
  missionBlockNumber: number;
  bodyHtml: string;
}

export interface MissionSynopsisBlock extends SessionSynopsisBlockInput {
  id: number;
  sessionId: number | null;
  missionSessionNumber: number | null;
  missionBlockNumber: number;
  bodyHtml: string;
}

export async function listGameSessions(): Promise<GameSession[]> {
  return readGameSessions();
}

export async function getGameSession(id: number): Promise<GameSession | null> {
  const [session] = await readGameSessions(id);
  return session ?? null;
}

async function readGameSessions(id?: number): Promise<GameSession[]> {
  const rows = await sql<GameSession[]>`
    SELECT s.id,
           s.session_date::text AS "sessionDate",
           s.title, s.mission_id AS "missionId", m.title AS "missionTitle",
           m.slug AS "missionSlug",
           s.mission_session_number AS "missionSessionNumber",
           s.session_ap AS "sessionAp", s.bonus_ap AS "bonusAp",
           u.name AS "createdByName",
           s.created_at::text AS "createdAt",
           COALESCE(p.character_count, 0)::int AS "characterCount",
           COALESCE(p.character_ids, ARRAY[]::int[]) AS "characterIds",
           COALESCE(e.total_ap, 0)::int AS "totalAp"
    FROM game_sessions s
    LEFT JOIN missions m ON m.id = s.mission_id
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
    ${id === undefined ? sql`` : sql`WHERE s.id = ${id}`}
    ORDER BY s.session_date DESC, s.id DESC
  `;

  const ids = rows.map((row) => row.id);
  const blockRows = ids.length
    ? await sql<
        {
          id: number;
          session_id: number;
          block_order: number;
          missionBlockNumber: number;
          ingame_date: string;
          body_md: string;
        }[]
      >`
        SELECT id, session_id, block_order,
               mission_block_number AS "missionBlockNumber",
               ingame_date::text AS ingame_date, body_md
        FROM (
          SELECT b.id, b.session_id, b.block_order, b.ingame_date, b.body_md,
                 ROW_NUMBER() OVER (
                   PARTITION BY b.mission_id
                   ORDER BY COALESCE(s.mission_session_number, 0), b.block_order, b.id
                 )::int AS mission_block_number
          FROM mission_synopsis_blocks b
          LEFT JOIN game_sessions s ON s.id = b.session_id
        ) numbered_blocks
        WHERE session_id = ANY(${sql.array(ids, 23)})
        ORDER BY session_id, block_order, id
      `
    : [];
  const blocksBySession = new Map<number, GameSessionSynopsisBlock[]>();
  for (const row of blockRows) {
    const blocks = blocksBySession.get(row.session_id) ?? [];
    blocks.push({
      id: row.id,
      blockOrder: row.block_order,
      missionBlockNumber: row.missionBlockNumber,
      ingameDate: row.ingame_date,
      body: row.body_md,
      bodyHtml: await renderContentHtml(row.body_md),
    });
    blocksBySession.set(row.session_id, blocks);
  }
  return rows.map((r) => ({
    ...r,
    synopsisBlocks: blocksBySession.get(r.id) ?? [],
  }));
}

export async function listMissionSynopsisBlocks(
  missionId: number,
): Promise<MissionSynopsisBlock[]> {
  const rows = await sql<
    {
      id: number;
      session_id: number | null;
      mission_session_number: number | null;
      mission_block_number: number;
      ingame_date: string;
      body_md: string;
    }[]
  >`
    SELECT b.id, b.session_id,
           s.mission_session_number AS mission_session_number,
           ROW_NUMBER() OVER (
             PARTITION BY b.mission_id
             ORDER BY COALESCE(s.mission_session_number, 0), b.block_order, b.id
           )::int AS mission_block_number,
           b.ingame_date::text AS ingame_date,
           b.body_md
    FROM mission_synopsis_blocks b
    LEFT JOIN game_sessions s ON s.id = b.session_id
    WHERE b.mission_id = ${missionId}
    ORDER BY b.ingame_date DESC, b.id DESC
  `;
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      sessionId: row.session_id,
      missionSessionNumber: row.mission_session_number,
      missionBlockNumber: row.mission_block_number,
      ingameDate: row.ingame_date,
      body: row.body_md,
      bodyHtml: await renderContentHtml(row.body_md),
    })),
  );
}

export interface SessionMissionOption {
  id: number;
  title: string;
  slug: string;
  startedAt: string | null;
}

export async function listSessionMissions(): Promise<SessionMissionOption[]> {
  return sql<SessionMissionOption[]>`
    SELECT id, title, slug, started_at::text AS "startedAt"
    FROM missions m
    WHERE deleted_at IS NULL AND is_draft = false
    ORDER BY started_at DESC NULLS LAST, created_at DESC, id DESC
  `;
}

// Beim Planen eines neuen Termins stehen nur laufende Missionen zur Auswahl.
// Der vollständige Bestand bleibt für historische Sessions und Bearbeitungen
// über listSessionMissions verfügbar.
export async function listActiveSessionMissions(): Promise<SessionMissionOption[]> {
  return sql<SessionMissionOption[]>`
    SELECT id, title, slug, started_at::text AS "startedAt"
    FROM missions m
    WHERE deleted_at IS NULL AND is_draft = false AND status = 'active'
    ORDER BY started_at DESC NULLS LAST, created_at DESC, id DESC
  `;
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
  missionId?: number;
  reservedMissionSessionNumber?: number;
  newMission?: { slug: string; title: string; ownerUserId: number };
  synopsisBlocks: SessionSynopsisBlockInput[];
  sessionAp: number;
  bonusAp: number;
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
  const { sessionId, missionId } = await sql.begin(async (tx) => {
    let missionId = input.missionId;
    if (input.newMission) {
      const [createdMission] = await tx<{ id: number }[]>`
        INSERT INTO missions (
          slug, title, status, started_at, ended_at, metadata, source_md,
          owner_user_id, is_draft, updated_at
        ) VALUES (
          ${input.newMission.slug}, ${input.newMission.title}, 'active',
          NULL, NULL,
          ${tx.json({ tags: [], body: "", teaser: null })},
          '', ${input.newMission.ownerUserId}, false, NOW()
        )
        RETURNING id
      `;
      missionId = createdMission.id;
    }
    if (!missionId) throw new Error("Für die Session ist eine Mission erforderlich.");

    const [mission] = await tx<{ id: number; title: string }[]>`
      SELECT id, title FROM missions
      WHERE id = ${missionId} AND deleted_at IS NULL AND is_draft = false
      FOR UPDATE
    `;
    if (!mission) throw new Error("Mission für diese Session nicht gefunden.");

    let missionSessionNumber = input.reservedMissionSessionNumber;
    if (missionSessionNumber == null) {
      const [sequence] = await tx<{ number: number }[]>`
        SELECT GREATEST(
          COALESCE((SELECT MAX(mission_session_number) FROM game_sessions WHERE mission_id = ${missionId}), 0),
          COALESCE((SELECT MAX(mission_session_number) FROM planned_sessions WHERE mission_id = ${missionId}), 0)
        ) + 1 AS number
      `;
      missionSessionNumber = sequence.number;
    }
    const title = `${mission.title} ${missionSessionNumber}`;

    const [session] = await tx<{ id: number }[]>`
      INSERT INTO game_sessions (session_date, mission_id, mission_session_number, title, session_ap, bonus_ap, notes, created_by)
      VALUES (${input.sessionDate}, ${missionId}, ${missionSessionNumber}, ${title}, ${input.sessionAp},
              ${input.bonusAp}, '', ${input.createdByUserId})
      RETURNING id
    `;

    await replaceSessionSynopsisBlocks(tx, session.id, missionId, input.synopsisBlocks);

    // Teilnehmende festhalten — auch wenn es (noch) keine AP gibt: die
    // automatische Logbuch-AP braucht später diese Liste.
    for (const characterId of input.characterIds) {
      await tx`
        INSERT INTO game_session_characters (session_id, character_id)
        VALUES (${session.id}, ${characterId})
        ON CONFLICT DO NOTHING
      `;
    }

    const note = title;
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

    return { sessionId: session.id, missionId };
  });
  await syncMissionSynopsis(missionId);
  return sessionId;
}

// Bereits gutgeschriebene Figuren bleiben bei Korrekturen auswählbar, auch
// wenn sie inzwischen inaktiv sind. Sonst würde Speichern ihre AP entfernen.
export async function listCharactersForSessionEdit(sessionId: number): Promise<ActiveCharacter[]> {
  return sql<ActiveCharacter[]>`
    SELECT c.id, c.name, u.name AS "playerName"
    FROM characters c
    LEFT JOIN users u ON u.id = c.player_id
    WHERE (c.deleted_at IS NULL AND c.is_draft = false
           AND c.status = 'active' AND c.player_id IS NOT NULL)
       OR EXISTS (
         SELECT 1 FROM game_session_characters p
         WHERE p.session_id = ${sessionId} AND p.character_id = c.id
       )
    ORDER BY c.name
  `;
}

async function replaceSessionSynopsisBlocks(
  tx: SqlClient,
  sessionId: number,
  missionId: number,
  blocks: SessionSynopsisBlockInput[],
): Promise<void> {
  await tx`DELETE FROM mission_synopsis_blocks WHERE session_id = ${sessionId}`;
  for (const [blockOrder, block] of blocks.entries()) {
    await tx`
      INSERT INTO mission_synopsis_blocks
        (mission_id, session_id, block_order, ingame_date, body_md)
      VALUES (${missionId}, ${sessionId}, ${blockOrder}, ${block.ingameDate},
              ${block.body})
    `;
  }
}

export async function updateMissionSynopsisBlock(input: {
  id: number;
  missionId: number;
  ingameDate: string;
  body: string;
}): Promise<boolean> {
  const [updated] = await sql<{ id: number }[]>`
    UPDATE mission_synopsis_blocks
    SET ingame_date = ${input.ingameDate}, body_md = ${input.body}
    WHERE id = ${input.id} AND mission_id = ${input.missionId}
    RETURNING id
  `;
  if (!updated) return false;
  await syncMissionSynopsis(input.missionId);
  return true;
}

export async function deleteMissionSynopsisBlock(
  id: number,
  missionId: number,
): Promise<boolean> {
  const [deleted] = await sql<{ id: number }[]>`
    DELETE FROM mission_synopsis_blocks
    WHERE id = ${id} AND mission_id = ${missionId}
    RETURNING id
  `;
  if (!deleted) return false;
  await syncMissionSynopsis(missionId);
  return true;
}

async function syncMissionSynopsis(missionId: number): Promise<void> {
  const rows = await sql<SessionSynopsisBlockInput[]>`
    SELECT ingame_date::text AS "ingameDate", body_md AS body
    FROM mission_synopsis_blocks
    WHERE mission_id = ${missionId}
    ORDER BY ingame_date DESC, id DESC
  `;
  const sourceMarkdown = buildMissionSynopsisMarkdown(rows);
  const bodyHtml = sourceMarkdown ? await renderContentHtml(sourceMarkdown) : "";
  await sql`
    UPDATE missions
    SET source_md = ${sourceMarkdown},
        metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{body}', to_jsonb(${bodyHtml}::text)),
        updated_at = NOW()
    WHERE id = ${missionId}
  `;
}

// Session zurücknehmen. Die Gutschriften verschwinden per ON DELETE CASCADE
// mit — sonst bliebe Guthaben aus einer nie gespielten Session stehen.
// Bereits ausgegebene AP holt das nicht zurück; der Kontostand kann dadurch
// rechnerisch negativ werden, was die Spielleitung im Journal sieht und mit
// einer Korrekturbuchung geradeziehen kann.
export async function deleteGameSession(id: number): Promise<string | null> {
  const [deleted] = await sql<{ missionId: number | null }[]>`
    DELETE FROM game_sessions
    WHERE id = ${id}
    RETURNING mission_id AS "missionId"
  `;
  if (!deleted) return null;
  if (deleted.missionId == null) return "";
  const [mission] = await sql<{ slug: string }[]>`
    SELECT slug FROM missions WHERE id = ${deleted.missionId}
  `;
  await syncMissionSynopsis(deleted.missionId);
  return mission?.slug ?? "";
}

// Eine eingetragene Session vollständig korrigieren: Datum, Titel, AP-Beträge,
// Synopsisblöcke und Teilnehmende. Die Gutschriften der Session werden dabei neu
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
  missionId: number;
  synopsisBlocks: SessionSynopsisBlockInput[];
  sessionAp: number;
  bonusAp: number;
  characterIds: number[];
  actingUserId: number;
}

export async function updateGameSession(
  input: UpdateGameSessionInput,
): Promise<{
  oldMissionId: number | null;
  oldMissionSlug: string | null;
  missionSlug: string;
} | null> {
  // Vor der Transaktion laden: src/lib/db.ts hält nur EINE Connection, eine
  // Abfrage über den globalen Client währenddessen würde blockieren.
  const rules = await getAdvancementRules();

  const result = await sql.begin(async (tx) => {
    const [existing] = await tx<{ missionId: number | null; missionSessionNumber: number | null }[]>`
      SELECT mission_id AS "missionId", mission_session_number AS "missionSessionNumber"
      FROM game_sessions WHERE id = ${input.id} FOR UPDATE
    `;
    if (!existing) return null;
    const [mission] = await tx<{ slug: string; title: string }[]>`
      SELECT slug, title FROM missions
      WHERE id = ${input.missionId} AND deleted_at IS NULL AND is_draft = false
      FOR UPDATE
    `;
    if (!mission) throw new Error("Mission für diese Session nicht gefunden.");

    let missionSessionNumber = existing.missionSessionNumber;
    if (existing.missionId !== input.missionId || missionSessionNumber == null) {
      const [sequence] = await tx<{ number: number }[]>`
        SELECT GREATEST(
          COALESCE((SELECT MAX(mission_session_number) FROM game_sessions WHERE mission_id = ${input.missionId} AND id <> ${input.id}), 0),
          COALESCE((SELECT MAX(mission_session_number) FROM planned_sessions WHERE mission_id = ${input.missionId}), 0)
        ) + 1 AS number
      `;
      missionSessionNumber = sequence.number;
    }
    const title = `${mission.title} ${missionSessionNumber}`;

    const rows = await tx<{ id: number }[]>`
      UPDATE game_sessions
      SET session_date = ${input.sessionDate}, mission_id = ${input.missionId},
          mission_session_number = ${missionSessionNumber}, title = ${title},
          session_ap = ${input.sessionAp}, bonus_ap = ${input.bonusAp},
          updated_at = NOW()
      WHERE id = ${input.id}
      RETURNING id
    `;
    if (rows.length === 0) return null;
    await tx`
      UPDATE planned_sessions
      SET mission_id = ${input.missionId},
          mission_session_number = ${missionSessionNumber},
          title = ${title}, updated_at = NOW()
      WHERE game_session_id = ${input.id}
    `;
    await replaceSessionSynopsisBlocks(
      tx,
      input.id,
      input.missionId,
      input.synopsisBlocks,
    );

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

    const note = title;
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

    let oldMissionSlug: string | null = null;
    if (existing.missionId != null && existing.missionId !== input.missionId) {
      const [oldMission] = await tx<{ slug: string }[]>`
        SELECT slug FROM missions WHERE id = ${existing.missionId}
      `;
      oldMissionSlug = oldMission?.slug ?? null;
    }
    return {
      oldMissionId: existing.missionId,
      oldMissionSlug,
      missionSlug: mission.slug,
    };
  });
  if (!result) return null;
  if (result.oldMissionId != null && result.oldMissionId !== input.missionId) {
    await syncMissionSynopsis(result.oldMissionId);
  }
  await syncMissionSynopsis(input.missionId);
  return result;
}

// Erhält automatische Logbuch-AP aus bestehenden historischen Zuordnungen.
// Neue Sessions bieten keine Logbuch-Zuordnung mehr an.
//
// Idempotent und darum gefahrlos mehrfach aufrufbar (nach dem Verknüpfen, nach
// dem Löschen eines Logs, nach dem Ändern der Teilnehmenden). Die Buchungen
// tragen reason 'logbook' und die session_id — daran erkennt die Funktion die
// bereits gebuchten Charaktere wieder.
export async function syncSessionLogbookAp(
  sessionId: number,
  actingUserId: number,
  // Vorgeladenes Regelwerk und Transaktions-Client für Aufrufe aus einer
  // offenen Transaktion heraus — src/lib/db.ts hält nur
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

// Nach dem Löschen/Wiederherstellen eines Logbuchs historische Logbuch-AP
// nachziehen. Ohne bestehende Session-Zuordnung ist das ein No-op.
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
