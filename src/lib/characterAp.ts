import "server-only";
import sql from "@/lib/db";
import {
  parseCharacterStats,
  hasCompleteCreationValues,
} from "@/lib/characterStats";
import {
  checkAdvancement,
  applyAdvancement,
  creationBudget,
  creationCarryOver,
  type AdvancementRequest,
  type AdvancementRules,
} from "@/lib/advancement";
import { getAdvancementRules } from "@/lib/advancementSettings";
import {
  revertAdvancements,
  reapplyAdvancements,
} from "@/lib/creationReset";
import type { CharacterStats } from "@/types/characterStats";

// Die Buchungsgründe und Kontotypen selbst liegen DB-frei in
// src/lib/apReasons.ts (Client-Komponenten brauchen die Labels) und werden
// hier der Bequemlichkeit halber mit re-exportiert.
export {
  AP_REASONS,
  AP_REASON_LABELS,
  isApReason,
  type ApReason,
  type ApEntry,
  type ApAccount,
} from "@/lib/apReasons";
import type { ApReason, ApEntry, ApAccount } from "@/lib/apReasons";

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
// über AP-Steigerungen veränderbar (siehe advanceOwnCharacter oben). Was von
// den Erschaffungsbudgets übrig geblieben ist, wird dabei (gedeckelt, siehe
// creationCarryOver) als AP gutgeschrieben — in DERSELBEN Transaktion wie das
// Festschreiben, sonst könnte ein Abbruch dazwischen entweder die Gutschrift
// ohne Sperre oder die Sperre ohne Gutschrift hinterlassen.
//
// Bewusst lesen-ändern-schreiben statt jsonb_set: hat ein Charakter noch gar
// keinen stats-Teilbaum, könnte jsonb_set den verschachtelten Pfad nicht
// anlegen. So entsteht er beim Festschreiben einfach mit.
export class CreationOverBudgetError extends Error {}

// Festschreiben eines Bogens, dessen Attribute/Disziplinen noch gar nicht
// gespeichert sind (siehe hasCompleteCreationValues).
export class CreationIncompleteError extends Error {}

export interface LockCreationResult {
  slug: string;
  carryOver: number;
  // Beim Zurücksetzen notierte Steigerungen, die jetzt wieder angewandt wurden.
  reapplied: { label: string; cost: number }[];
  // … und die, für die es nicht mehr gereicht hat, mit dem Grund.
  skipped: { label: string; error: string }[];
}

export async function lockOwnCharacterCreation(
  userId: number,
  characterId: number,
): Promise<LockCreationResult | null> {
  // Regelwerk VOR der Transaktion laden — siehe advanceOwnCharacter.
  const rules = await getAdvancementRules();

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

    // Bereits festgeschrieben? Dann nichts tun — ein zweiter Aufruf (Doppelklick,
    // erneut abgeschickt) darf die Rest-AP nicht ein zweites Mal gutschreiben.
    if (stats.creationLocked) {
      return { slug: row.slug, carryOver: 0, reapplied: [], skipped: [] };
    }

    // Überzogenes Erschaffungsbudget wird hier abgelehnt, nicht nur im
    // Formular (dort ist der Knopf deaktiviert): ein direkt abgeschickter
    // POST würde den Charakter sonst dauerhaft überzogen festschreiben — und
    // dabei sogar noch Rest-AP gutschreiben, weil creationCarryOver
    // Überziehungen als 0 zählt statt negativ.
    if (creationBudget(stats, rules).overBudget) {
      throw new CreationOverBudgetError(
        "Das Erschaffungsbudget ist überzogen — bitte zuerst Werte zurücknehmen.",
      );
    }

    // Maßgeblich ist der GESPEICHERTE Stand: das Formular rechnet Budget und
    // Rest-AP live mit den gerade eingetippten Werten (liveStats in
    // CharacterSheet.tsx), abgeschickt wird aber nur die Charakter-ID. Wer
    // tippt und dann festschreibt, ohne vorher zu speichern, hätte sonst einen
    // Bogen mit leeren Attributen — dauerhaft, denn danach sind beide Blöcke
    // schreibgeschützt und checkAdvancement steigert keinen leeren Wert.
    if (!hasCompleteCreationValues(stats)) {
      throw new CreationIncompleteError(
        "Bitte zuerst alle Attribute und Disziplinen speichern — festgeschrieben werden nur gespeicherte Werte.",
      );
    }

    const carryOver = creationCarryOver(stats, rules);

    // Hat die Spielleitung die Erschaffung zurückgesetzt, stehen die damals
    // zurückgenommenen Steigerungen als Notiz am Bogen (siehe
    // reopenCharacterCreation). Sie werden jetzt wieder angewandt — mit den
    // HEUTE geltenden Regeln, dem Kontostand NACH der Gutschrift des
    // Erschaffungsrests und derselben Prüfung wie beim Steigern. Was nicht
    // mehr geht (AP reichen nicht, Regelgrenze), bleibt liegen und wird
    // gemeldet statt still angewandt.
    const [balance] = await tx<{ available: number }[]>`
      SELECT COALESCE(SUM(amount), 0)::int AS available
      FROM character_ap_entries
      WHERE character_id = ${characterId}
    `;
    const reapplied = reapplyAdvancements(
      stats,
      stats.pendingAdvancements,
      (balance?.available ?? 0) + carryOver,
      rules,
    );
    const nextStats: CharacterStats = {
      ...reapplied.stats,
      creationLocked: true,
    };

    await tx`
      UPDATE characters
      SET metadata = metadata || ${tx.json({ stats: nextStats } as ReturnType<typeof JSON.parse>)},
          updated_at = NOW()
      WHERE id = ${characterId} AND player_id = ${userId}
    `;

    if (carryOver > 0) {
      await tx`
        INSERT INTO character_ap_entries (character_id, amount, reason, note, created_by)
        VALUES (${characterId}, ${carryOver}, 'creation',
                'Nicht verbrauchtes Erschaffungsbudget', ${userId})
      `;
    }

    for (const booking of reapplied.applied) {
      await tx`
        INSERT INTO character_ap_entries (character_id, amount, reason, note, created_by)
        VALUES (${characterId}, ${-booking.cost}, 'advancement',
                ${booking.label}, ${userId})
      `;
    }

    return {
      slug: row.slug,
      carryOver,
      reapplied: reapplied.applied,
      skipped: reapplied.skipped,
    };
  });
}

// ── Erschaffung wieder öffnen (Spielleitung) ───────────────────────────
// Gegenstück zu lockOwnCharacterCreation: der Bogen geht zurück in die
// Erschaffung, alles seither Gesteigerte wird zurückgenommen — aber am
// Charakter notiert, damit dieselben Steigerungen beim erneuten Abschließen
// automatisch wieder angewandt werden (siehe src/lib/creationReset.ts).
//
// Alles in EINER Transaktion: Werte, Notiz und die Gegenbuchungen gehören
// zusammen — ein Abbruch dazwischen hinterließe entweder zurückgesetzte Werte
// ohne Gutschrift oder eine Gutschrift ohne Rücknahme.
//
// Nicht owner-gescoped (anders als die übrigen Funktionen hier): das ist eine
// Handlung der Spielleitung an einem fremden Charakter. Das Recht prüft der
// Aufrufer (siehe reopenCreationAction).
export type ReopenCreationResult =
  | {
      ok: true;
      slug: string;
      name: string;
      // Zurückgenommene Steigerungen (werden beim Abschließen wieder angewandt).
      reverted: { label: string; cost: number }[];
      // Summe der Gutschriften abzüglich des zurückgebuchten Erschaffungsrests.
      apChange: number;
      // Buchungen, die sich keinem Ziel zuordnen ließen — sie bleiben stehen.
      unresolved: string[];
    }
  | { ok: false; error: string };

export async function reopenCharacterCreation(
  characterId: number,
  gmUserId: number,
): Promise<ReopenCreationResult> {
  return sql.begin(async (tx) => {
    const rows = await tx<{ slug: string; name: string; stats: unknown }[]>`
      SELECT slug, name, metadata -> 'stats' AS stats
      FROM characters
      WHERE id = ${characterId} AND deleted_at IS NULL
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      return { ok: false as const, error: "Charakter nicht gefunden." };
    }

    const stats = parseCharacterStats(
      typeof row.stats === "string" ? JSON.parse(row.stats) : row.stats,
    );

    if (!stats.creationLocked) {
      return {
        ok: false as const,
        error: `„${row.name}" ist bereits in der Erschaffung.`,
      };
    }

    // Maßgeblich ist NUR, was seit dem letzten Zurücksetzen gebucht wurde:
    // Ältere Steigerungen hat der damalige Reset bereits zurückgenommen und
    // erstattet — und beim erneuten Abschließen wurden sie als NEUE Buchung
    // wieder angewandt. Ohne diese Grenze zählte ein zweites Zurücksetzen
    // dieselbe Steigerung doppelt: doppelte Gutschrift und ein doppelter
    // Eintrag in der Notiz, der beim nächsten Abschließen zweimal steigern
    // würde. Die SERIAL-id wächst je Buchung, taugt also als Marke — anders
    // als created_at, das innerhalb einer Transaktion für alle Zeilen gleich
    // ist.
    const [marker] = await tx<{ lastReset: number | null }[]>`
      SELECT MAX(id) AS "lastReset"
      FROM character_ap_entries
      WHERE character_id = ${characterId} AND reason = 'reset'
    `;
    const sinceId = marker?.lastReset ?? 0;

    // Die Steigerungen in der Reihenfolge des Journals (neueste zuerst) —
    // genau so nimmt revertAdvancements sie Schritt für Schritt zurück.
    const bookings = await tx<
      { amount: number; note: string | null; createdAt: string }[]
    >`
      SELECT amount, note, created_at::text AS "createdAt"
      FROM character_ap_entries
      WHERE character_id = ${characterId}
        AND reason = 'advancement' AND amount < 0
        AND id > ${sinceId}
      ORDER BY id DESC
    `;

    const result = revertAdvancements(stats, bookings);

    // Der beim Festschreiben gutgeschriebene Erschaffungsrest muss zurück:
    // beim erneuten Abschließen wird er neu berechnet und neu gutgeschrieben,
    // sonst stünde er doppelt auf dem Konto. Auch hier zählt nur, was seit dem
    // letzten Zurücksetzen dazukam (siehe oben).
    const [credited] = await tx<{ total: number }[]>`
      SELECT COALESCE(SUM(amount), 0)::int AS total
      FROM character_ap_entries
      WHERE character_id = ${characterId} AND reason = 'creation'
        AND id > ${sinceId}
    `;
    const carryOverCredited = credited?.total ?? 0;

    await tx`
      UPDATE characters
      SET metadata = metadata || ${tx.json({ stats: result.stats } as ReturnType<typeof JSON.parse>)},
          updated_at = NOW()
      WHERE id = ${characterId}
    `;

    for (const refund of result.refunds) {
      await tx`
        INSERT INTO character_ap_entries (character_id, amount, reason, note, created_by)
        VALUES (${characterId}, ${refund.cost}, 'reset',
                ${`Zurückgenommen: ${refund.label}`}, ${gmUserId})
      `;
    }

    if (carryOverCredited > 0) {
      await tx`
        INSERT INTO character_ap_entries (character_id, amount, reason, note, created_by)
        VALUES (${characterId}, ${-carryOverCredited}, 'reset',
                'Erschaffungsrest zurückgebucht', ${gmUserId})
      `;
    }

    const refunded = result.refunds.reduce((sum, r) => sum + r.cost, 0);

    return {
      ok: true as const,
      slug: row.slug,
      name: row.name,
      reverted: result.refunds,
      apChange: refunded - carryOverCredited,
      unresolved: result.unresolved,
    };
  });
}
