import "server-only";
import type postgres from "postgres";
import sql from "@/lib/db";
import { markdownToHtml } from "@/lib/markdown";
import type {
  PlannedSession,
  PlannedSessionRsvp,
  RsvpResponse,
} from "@/lib/plannedSessionTypes";

// Der Blick nach vorn: angekündigte Spieltermine und die Zu-/Absagen dazu.
//
// game_sessions (gameSessions.ts) ist die Nachbuchung einer GESPIELTEN
// Session mitsamt AP. Hier geht es um den Termin davor — eigene Tabellen,
// weil ein Termin weder AP noch Gutschriften kennt und eine gespielte
// Session keine Zusagen mehr braucht.
//
// Ungecacht wie die gespielten Sessions: eine Zusage muss sofort stehen.

export type {
  PlannedSession,
  PlannedSessionRsvp,
  RsvpResponse,
} from "@/lib/plannedSessionTypes";

export interface PlannedSessionInput {
  scheduledAt: string;
  title: string;
  location: string;
  notes: string;
  characterIds: number[];
}

interface Row {
  id: number;
  scheduledAt: string;
  title: string;
  location: string;
  notes: string;
  createdByName: string | null;
  gameSessionId: number | null;
}

async function withDetails(rows: Row[]): Promise<PlannedSession[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  // Eine Abfrage für alle Termine statt einer je Termin: die Liste ist kurz,
  // die Roundtrips zur (entfernten) Datenbank sind es nicht.
  const rsvps = await sql<
    {
      sessionId: number;
      userId: number;
      userName: string;
      response: RsvpResponse;
      note: string;
    }[]
  >`
    SELECT r.session_id AS "sessionId", r.user_id AS "userId",
           u.name AS "userName", r.response, r.note
    FROM planned_session_rsvps r
    JOIN users u ON u.id = r.user_id
    WHERE r.session_id = ANY(${ids})
    ORDER BY u.name ASC
  `;
  const bySession = new Map<number, PlannedSessionRsvp[]>();
  for (const r of rsvps) {
    const list = bySession.get(r.sessionId) ?? [];
    list.push({
      userId: r.userId,
      userName: r.userName,
      response: r.response,
      note: r.note,
    });
    bySession.set(r.sessionId, list);
  }
  // Die eingeplanten Figuren in derselben Bauart: eine Abfrage für alle
  // Termine statt einer je Termin.
  const planned = await sql<{ sessionId: number; characterId: number }[]>`
    SELECT session_id AS "sessionId", character_id AS "characterId"
    FROM planned_session_characters
    WHERE session_id = ANY(${ids})
  `;
  const charactersBySession = new Map<number, number[]>();
  for (const row of planned) {
    const list = charactersBySession.get(row.sessionId) ?? [];
    list.push(row.characterId);
    charactersBySession.set(row.sessionId, list);
  }

  // Die Notiz ist Markdown (MarkdownEditor im Termin-Fenster); für die
  // Anzeige auf der Startseite wird daraus HTML. Die Liste ist kurz — eine
  // Runde plant Termine, keine Tausende.
  const notesHtml = await Promise.all(
    rows.map((row) => markdownToHtml(row.notes)),
  );

  return rows.map((row, index) => ({
    ...row,
    notesHtml: notesHtml[index],
    characterIds: charactersBySession.get(row.id) ?? [],
    rsvps: bySession.get(row.id) ?? [],
  }));
}

// Die eingeplanten Figuren eines Termins setzen — beim Ankündigen und beim
// Ändern dieselbe Rechnung: löschen, was nicht mehr dabei ist, einfügen, was
// neu ist. Läuft in der übergebenen Transaktion, damit ein Termin nie halb
// besetzt zurückbleibt.
type SqlClient = postgres.ISql;

async function replaceCharacters(
  tx: SqlClient,
  sessionId: number,
  characterIds: number[],
): Promise<void> {
  await tx`
    DELETE FROM planned_session_characters
    WHERE session_id = ${sessionId}
      AND character_id <> ALL(${characterIds})
  `;
  for (const characterId of characterIds) {
    await tx`
      INSERT INTO planned_session_characters (session_id, character_id)
      VALUES (${sessionId}, ${characterId})
      ON CONFLICT DO NOTHING
    `;
  }
}

const SELECT_COLUMNS = sql`
  s.id, s.scheduled_at::text AS "scheduledAt", s.title, s.location, s.notes,
  s.game_session_id AS "gameSessionId", u.name AS "createdByName"
`;

// Die anstehenden Termine, der nächste zuerst. „Anstehend" heißt seit v1.38:
// der Zeitpunkt liegt in der ZUKUNFT. Bis dahin galt eine Nachlauffrist von
// sechs Stunden, damit ein Termin nicht mitten im Spielabend aus der Liste
// fällt — das Dashboard zeigte dadurch aber stundenlang einen Abend an, der
// längst begonnen hatte, und mit ihm die Zusage-Knöpfe. „Nächste
// Spieltermine" heißt jetzt genau das; die Spielleitung sieht die
// vergangenen weiterhin über listAllPlannedSessions unter /gm/sessions.
export async function listUpcomingSessions(): Promise<PlannedSession[]> {
  const rows = await sql<Row[]>`
    SELECT ${SELECT_COLUMNS}
    FROM planned_sessions s
    LEFT JOIN users u ON u.id = s.created_by
    WHERE s.scheduled_at > NOW()
      AND s.game_session_id IS NULL
    ORDER BY s.scheduled_at ASC
  `;
  return withDetails(rows);
}

// Die Spielenden hinter den eingeplanten Figuren — Empfänger der
// Ankündigungs-Mail/-Push (siehe createPlannedSessionAction). Kontakt-Form
// wie bei Gesprächen (DialogueEmailTarget), damit der Versand-Code nebenan
// gleich aussieht, plus die Namen der eigenen eingeplanten Figuren: „du bist
// dabei" ist erst dann eine Aussage, wenn dabeisteht, mit wem.
//
// Je Person EIN Eintrag, auch wenn zwei ihrer Figuren eingeplant sind — zwei
// Mails für denselben Abend wäre Lärm. Figuren ohne Spieler:in (player_id IS
// NULL) und stillgelegte Konten fallen weg: dort gibt es niemanden zu
// benachrichtigen.
export interface PlannedSessionPlayer {
  id: number;
  email: string;
  name: string;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  characterNames: string[];
}

export async function getPlannedSessionPlayers(
  characterIds: number[],
): Promise<PlannedSessionPlayer[]> {
  if (characterIds.length === 0) return [];
  const rows = await sql<
    {
      id: number;
      email: string;
      name: string;
      emailNotificationsEnabled: boolean;
      pushNotificationsEnabled: boolean;
      characterName: string;
    }[]
  >`
    SELECT u.id, u.email, u.name,
           u.email_notifications_enabled AS "emailNotificationsEnabled",
           u.push_notifications_enabled AS "pushNotificationsEnabled",
           c.name AS "characterName"
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.id = ANY(${characterIds})
      AND c.deleted_at IS NULL
      AND u.is_active = true
    ORDER BY u.name ASC, c.name ASC
  `;

  const byUser = new Map<number, PlannedSessionPlayer>();
  for (const row of rows) {
    const existing = byUser.get(row.id);
    if (existing) {
      existing.characterNames.push(row.characterName);
      continue;
    }
    byUser.set(row.id, {
      id: row.id,
      email: row.email,
      name: row.name,
      emailNotificationsEnabled: row.emailNotificationsEnabled,
      pushNotificationsEnabled: row.pushNotificationsEnabled,
      characterNames: [row.characterName],
    });
  }
  return [...byUser.values()];
}

// Für die Spielleitung: auch die vergangenen Termine, neueste zuerst.
export async function listAllPlannedSessions(): Promise<PlannedSession[]> {
  const rows = await sql<Row[]>`
    SELECT ${SELECT_COLUMNS}
    FROM planned_sessions s
    LEFT JOIN users u ON u.id = s.created_by
    ORDER BY s.scheduled_at DESC
  `;
  return withDetails(rows);
}

export async function createPlannedSession(
  input: PlannedSessionInput,
  createdBy: number,
): Promise<number> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO planned_sessions (scheduled_at, title, location, notes, created_by)
      VALUES (${input.scheduledAt}, ${input.title}, ${input.location},
              ${input.notes}, ${createdBy})
      RETURNING id
    `;
    await replaceCharacters(tx, row.id, input.characterIds);
    return row.id;
  });
}

export async function updatePlannedSession(
  id: number,
  input: PlannedSessionInput,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE planned_sessions
      SET scheduled_at = ${input.scheduledAt}, title = ${input.title},
          location = ${input.location}, notes = ${input.notes},
          updated_at = NOW()
      WHERE id = ${id}
    `;
    await replaceCharacters(tx, id, input.characterIds);
  });
}

// Einen Termin als gespielt vermerken: er zeigt fortan auf die nachgetragene
// Session und verschwindet von der Startseite. Die Zusagen bleiben stehen —
// sie sind die Geschichte dieses Abends.
export async function linkPlannedSession(
  id: number,
  gameSessionId: number,
): Promise<void> {
  await sql`
    UPDATE planned_sessions
    SET game_session_id = ${gameSessionId}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

// Ein einzelner Termin — für die Nachbuchung, die Datum, Titel und die
// eingeplanten Figuren daraus übernimmt.
export async function getPlannedSession(
  id: number,
): Promise<PlannedSession | null> {
  const rows = await sql<Row[]>`
    SELECT ${SELECT_COLUMNS}
    FROM planned_sessions s
    LEFT JOIN users u ON u.id = s.created_by
    WHERE s.id = ${id}
  `;
  const [session] = await withDetails(rows);
  return session ?? null;
}

export async function deletePlannedSession(id: number): Promise<void> {
  await sql`DELETE FROM planned_sessions WHERE id = ${id}`;
}

// Zu- oder absagen. Eine zweite Antwort ersetzt die erste — man darf es sich
// anders überlegen.
export async function setRsvp(
  sessionId: number,
  userId: number,
  response: RsvpResponse,
  note: string,
): Promise<void> {
  await sql`
    INSERT INTO planned_session_rsvps (session_id, user_id, response, note)
    VALUES (${sessionId}, ${userId}, ${response}, ${note})
    ON CONFLICT (session_id, user_id)
    DO UPDATE SET response = EXCLUDED.response, note = EXCLUDED.note,
                  updated_at = NOW()
  `;
}
