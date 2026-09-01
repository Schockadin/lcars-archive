import "server-only";
import sql from "@/lib/db";
import type { ApReason } from "@/lib/characterAp";

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
  notes: string;
  createdByName: string | null;
  createdAt: string;
  // Wie vielen Charakteren wurde gutgeschrieben und wie viele AP insgesamt.
  characterCount: number;
  totalAp: number;
}

export async function listGameSessions(): Promise<GameSession[]> {
  return sql<GameSession[]>`
    SELECT s.id,
           s.session_date::text AS "sessionDate",
           s.title, s.session_ap AS "sessionAp", s.bonus_ap AS "bonusAp",
           s.notes,
           u.name AS "createdByName",
           s.created_at::text AS "createdAt",
           COALESCE(e.character_count, 0)::int AS "characterCount",
           COALESCE(e.total_ap, 0)::int AS "totalAp"
    FROM game_sessions s
    LEFT JOIN users u ON u.id = s.created_by
    LEFT JOIN (
      SELECT session_id,
             COUNT(DISTINCT character_id) AS character_count,
             SUM(amount) AS total_ap
      FROM character_ap_entries
      WHERE session_id IS NOT NULL
      GROUP BY session_id
    ) e ON e.session_id = s.id
    ORDER BY s.session_date DESC, s.id DESC
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

    const note = input.title.trim() || `Session vom ${input.sessionDate}`;
    const bookings: { amount: number; reason: ApReason }[] = [];
    if (input.sessionAp > 0) bookings.push({ amount: input.sessionAp, reason: "session" });
    if (input.bonusAp > 0) bookings.push({ amount: input.bonusAp, reason: "bonus" });

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
  const rows = await sql`DELETE FROM game_sessions WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// Nachträglich Notizen/Titel korrigieren. Die AP-Beträge bleiben bewusst
// unangetastet: sie sind bereits als Buchungen unterwegs, ein stilles
// Nachziehen wäre nicht nachvollziehbar.
export async function updateGameSessionNotes(
  id: number,
  title: string,
  notes: string,
): Promise<boolean> {
  const rows = await sql`
    UPDATE game_sessions SET title = ${title}, notes = ${notes}, updated_at = NOW()
    WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
