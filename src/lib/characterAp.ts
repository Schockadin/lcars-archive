import "server-only";
import sql from "@/lib/db";
import { parseCharacterStats } from "@/lib/characterStats";
import {
  checkAdvancement,
  applyAdvancement,
  type AdvancementRequest,
  type AdvancementRules,
} from "@/lib/advancement";
import { getAdvancementRules } from "@/lib/advancementSettings";
import type { CharacterStats } from "@/types/characterStats";

// Buchungen des AP-Kontos (siehe character_ap_entries in scripts/schema.sql).
// Der Kontostand ist immer die Summe der Buchungen — es gibt bewusst kein
// zusätzliches Saldo-Feld, das mit dem Journal auseinanderlaufen könnte.
export const AP_REASONS = [
  "session", // Es wurde eine Session gespielt (+1)
  "logbook", // Es wurde ein Logbuch zur Session geschrieben (+1)
  "bonus", // Bonus-AP einer Session (siehe /gm/sessions)
  "mission", // Abschluss einer Mission / eines Story-Arcs (+X)
  "manual", // Freie Korrektur durch die Spielleitung
  "advancement", // Ausgabe beim Steigern (negativ)
] as const;

export type ApReason = (typeof AP_REASONS)[number];

export const AP_REASON_LABELS: Record<ApReason, string> = {
  session: "Session gespielt",
  logbook: "Logbuch geschrieben",
  bonus: "Bonus",
  mission: "Mission / Story-Arc abgeschlossen",
  manual: "Korrektur",
  advancement: "Steigerung",
};

export function isApReason(value: string): value is ApReason {
  return (AP_REASONS as readonly string[]).includes(value);
}

export interface ApEntry {
  id: number;
  amount: number;
  reason: ApReason;
  note: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface ApAccount {
  earned: number;
  spent: number;
  available: number;
  entries: ApEntry[];
}

// Kontostand + Journal eines Charakters. Nicht gecacht: der Stand ändert sich
// durch Vergabe und Steigern und muss sofort stimmen.
export async function getApAccount(characterId: number): Promise<ApAccount> {
  const rows = await sql<
    {
      id: number;
      amount: number;
      reason: ApReason;
      note: string | null;
      createdAt: string;
      createdByName: string | null;
    }[]
  >`
    SELECT e.id, e.amount, e.reason, e.note,
           e.created_at::text AS "createdAt",
           u.name AS "createdByName"
    FROM character_ap_entries e
    LEFT JOIN users u ON u.id = e.created_by
    WHERE e.character_id = ${characterId}
    ORDER BY e.created_at DESC, e.id DESC
  `;

  let earned = 0;
  let spent = 0;
  for (const entry of rows) {
    if (entry.amount >= 0) earned += entry.amount;
    else spent += -entry.amount;
  }

  return { earned, spent, available: earned - spent, entries: rows };
}

// Nur der Kontostand (ohne Journal) — für Übersichten und die Prüfung in der
// Steigerungs-Action.
export async function getAvailableAp(characterId: number): Promise<number> {
  const [row] = await sql<{ available: number }[]>`
    SELECT COALESCE(SUM(amount), 0)::int AS available
    FROM character_ap_entries
    WHERE character_id = ${characterId}
  `;
  return row?.available ?? 0;
}

// Kontostände aller Charaktere auf einmal — für die Vergabe-Übersicht der
// Spielleitung, damit dort nicht pro Charakter einzeln abgefragt wird.
export async function listApBalances(): Promise<
  { characterId: number; available: number }[]
> {
  return sql<{ characterId: number; available: number }[]>`
    SELECT character_id AS "characterId", SUM(amount)::int AS available
    FROM character_ap_entries
    GROUP BY character_id
  `;
}

// ── Gesamtübersicht der Spielleitung (/gm/ap) ──────────────────────────

export interface ApLedgerEntry extends ApEntry {
  characterId: number;
  characterName: string;
  // Gesetzt, wenn die Buchung aus einer eingetragenen Session stammt.
  sessionId: number | null;
}

// Alle Buchungen aller Charaktere, neueste zuerst. Bewusst mit Obergrenze:
// das Journal wächst mit jeder Session, die Seite soll aber nicht irgendwann
// Tausende Zeilen ausliefern.
export const AP_LEDGER_LIMIT = 500;

export async function listApLedger(
  limit: number = AP_LEDGER_LIMIT,
): Promise<ApLedgerEntry[]> {
  return sql<ApLedgerEntry[]>`
    SELECT e.id, e.amount, e.reason, e.note,
           e.created_at::text AS "createdAt",
           e.session_id AS "sessionId",
           c.id AS "characterId", c.name AS "characterName",
           u.name AS "createdByName"
    FROM character_ap_entries e
    JOIN characters c ON c.id = e.character_id
    LEFT JOIN users u ON u.id = e.created_by
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT ${limit}
  `;
}

export interface ApAccountSummary {
  characterId: number;
  characterName: string;
  playerName: string | null;
  earned: number;
  spent: number;
  available: number;
}

// Kontostände aller Charaktere, die überhaupt Buchungen haben — in EINER
// Abfrage statt je Charakter einzeln.
export async function listApAccountSummaries(): Promise<ApAccountSummary[]> {
  return sql<ApAccountSummary[]>`
    SELECT c.id AS "characterId", c.name AS "characterName",
           u.name AS "playerName",
           COALESCE(SUM(e.amount) FILTER (WHERE e.amount > 0), 0)::int AS earned,
           COALESCE(-SUM(e.amount) FILTER (WHERE e.amount < 0), 0)::int AS spent,
           COALESCE(SUM(e.amount), 0)::int AS available
    FROM characters c
    JOIN character_ap_entries e ON e.character_id = c.id
    LEFT JOIN users u ON u.id = c.player_id
    WHERE c.deleted_at IS NULL
    GROUP BY c.id, c.name, u.name
    ORDER BY c.name
  `;
}

// AP vergeben (Spielleitung). Der Aufrufer prüft die Rechte; hier wird nur
// gebucht. amount darf negativ sein (Korrektur), aber nicht 0 — das verbietet
// bereits der CHECK der Tabelle.
export async function awardAp(input: {
  characterId: number;
  amount: number;
  reason: ApReason;
  note: string | null;
  createdByUserId: number;
}): Promise<void> {
  await sql`
    INSERT INTO character_ap_entries (character_id, amount, reason, note, created_by)
    VALUES (${input.characterId}, ${input.amount}, ${input.reason},
            ${input.note}, ${input.createdByUserId})
  `;
}

export type AdvanceResult =
  | { ok: true; slug: string; cost: number; label: string }
  | { ok: false; error: string };

// Steigern: prüft Regeln und AP-Deckung und schreibt Wertänderung UND Buchung
// in EINER Transaktion — sonst könnte ein Abbruch dazwischen entweder die
// Steigerung ohne Abbuchung oder die Abbuchung ohne Steigerung hinterlassen.
//
// Owner-gescoped wie die übrigen updateOwnX-Funktionen: das UPDATE trifft bei
// fremder characterId 0 Zeilen. Der Kontostand wird INNERHALB der Transaktion
// erneut gelesen, damit zwei gleichzeitige Steigerungen nicht beide dasselbe
// Guthaben ausgeben (die Zeilensperre auf characters serialisiert sie).
export async function advanceOwnCharacter(
  userId: number,
  characterId: number,
  request: AdvancementRequest,
): Promise<AdvanceResult> {
  // Regelwerk VOR der Transaktion laden: src/lib/db.ts erlaubt nur EINE
  // Connection pro Prozess, eine zweite Abfrage innerhalb der offenen
  // Transaktion würde auf eine nie freiwerdende Connection warten.
  const rules: AdvancementRules = await getAdvancementRules();

  return sql.begin(async (tx) => {
    const rows = await tx<{ slug: string; stats: unknown }[]>`
      SELECT slug, metadata -> 'stats' AS stats
      FROM characters
      WHERE id = ${characterId} AND player_id = ${userId} AND deleted_at IS NULL
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      return { ok: false as const, error: "Charakter nicht gefunden oder keine Berechtigung." };
    }

    const stats = parseCharacterStats(
      typeof row.stats === "string" ? JSON.parse(row.stats) : row.stats,
    );

    if (!stats.creationLocked) {
      return {
        ok: false as const,
        error:
          "Der Charakter ist noch in der Erschaffung — erst festschreiben, dann steigern.",
      };
    }

    const [balance] = await tx<{ available: number }[]>`
      SELECT COALESCE(SUM(amount), 0)::int AS available
      FROM character_ap_entries
      WHERE character_id = ${characterId}
    `;
    const available = balance?.available ?? 0;

    const check = checkAdvancement(stats, request, available, rules);
    if (!check.ok) return { ok: false as const, error: check.error };

    const nextStats: CharacterStats = applyAdvancement(stats, request, check.plan);

    await tx`
      UPDATE characters
      SET metadata = metadata || ${tx.json({ stats: nextStats } as ReturnType<typeof JSON.parse>)},
          updated_at = NOW()
      WHERE id = ${characterId} AND player_id = ${userId}
    `;

    await tx`
      INSERT INTO character_ap_entries (character_id, amount, reason, note, created_by)
      VALUES (${characterId}, ${-check.plan.cost}, 'advancement',
              ${check.plan.label}, ${userId})
    `;

    return {
      ok: true as const,
      slug: row.slug,
      cost: check.plan.cost,
      label: check.plan.label,
    };
  });
}

// Ersterschaffung abschließen: ab jetzt sind Attribute/Disziplinen nur noch
// über AP-Steigerungen veränderbar (siehe advanceOwnCharacter oben).
// Bewusst lesen-ändern-schreiben statt jsonb_set: hat ein Charakter noch gar
// keinen stats-Teilbaum, könnte jsonb_set den verschachtelten Pfad nicht
// anlegen. So entsteht er beim Festschreiben einfach mit.
export async function lockOwnCharacterCreation(
  userId: number,
  characterId: number,
): Promise<{ slug: string } | null> {
  return sql.begin(async (tx) => {
    const rows = await tx<{ slug: string; stats: unknown }[]>`
      SELECT slug, metadata -> 'stats' AS stats
      FROM characters
      WHERE id = ${characterId} AND player_id = ${userId} AND deleted_at IS NULL
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) return null;

    const stats = parseCharacterStats(
      typeof row.stats === "string" ? JSON.parse(row.stats) : row.stats,
    );

    await tx`
      UPDATE characters
      SET metadata = metadata || ${tx.json({ stats: { ...stats, creationLocked: true } } as ReturnType<typeof JSON.parse>)},
          updated_at = NOW()
      WHERE id = ${characterId} AND player_id = ${userId}
    `;

    return { slug: row.slug };
  });
}
