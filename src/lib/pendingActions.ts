import "server-only";
import sql from "@/lib/db";
import {
  archiveHref,
  dialogueHref,
  missionHref,
} from "@/lib/contentRoutes";

// Was diese Person schuldet.
//
// Das Dashboard zeigte bisher nur, was ANDERE getan haben (Neuigkeiten,
// Lesezeichen, offene Gespräche). Was man selbst noch tun wollte, stand
// nirgends — man musste sich erinnern, welche Mission noch keinen Bericht
// hat und in welchem Gespräch man am Zug ist.
//
// Drei Quellen, alle aus vorhandenen Daten:
//   1. Missionen, an denen eine eigene Figur teilnimmt, ohne Logbuch von mir
//   2. Gespräche, in denen ich Teilnehmer bin und die letzte Nachricht nicht
//      von mir ist
//   3. eigene Entwürfe, die länger liegen als DRAFT_STALE_DAYS
//
// Bewusst KEINE eigene Tabelle: eine Aufgabe ist hier immer eine Ableitung
// aus dem Bestand, kein eigener Zustand, der gepflegt werden müsste.

export type PendingActionKind = "mission_log" | "dialogue_reply" | "draft";

export interface PendingAction {
  kind: PendingActionKind;
  // Was zu tun ist, aus der Sicht der Person („Logbuch schreiben").
  label: string;
  // Woran (Titel der Mission, des Gesprächs, des Entwurfs).
  subject: string;
  href: string;
  // Wonach sortiert wird: das Datum, seit dem es aussteht. Je älter, desto
  // weiter oben.
  since: string;
}

// Ein Entwurf gilt als liegengeblieben, wenn er eine Woche nicht angefasst
// wurde — vorher ist er einfach Arbeit in Arbeit.
export const DRAFT_STALE_DAYS = 7;

export async function getPendingActions(
  userId: number,
): Promise<PendingAction[]> {
  const [missions, dialogues, drafts] = await Promise.all([
    // 1. Missionen mit eigener Figur, aber ohne eigenes Logbuch. Gezählt wird
    // je Mission, nicht je Figur: zwei eigene Figuren in derselben Mission
    // sind eine Aufgabe, nicht zwei.
    sql<{ slug: string; title: string; since: string }[]>`
      SELECT DISTINCT m.slug, m.title,
             coalesce(m.started_at::text, m.created_at::text) AS since
      FROM missions m
      JOIN mission_participants mp ON mp.mission_id = m.id
      JOIN characters c ON c.id = mp.character_id
      WHERE c.player_id = ${userId}
        AND c.deleted_at IS NULL
        AND m.deleted_at IS NULL AND m.is_draft = false
        AND NOT EXISTS (
          SELECT 1 FROM mission_logs ml
          WHERE ml.mission_id = m.id
            AND ml.owner_user_id = ${userId}
            AND ml.deleted_at IS NULL
        )
    `,
    // 2. Gespräche, in denen ich am Zug bin: ich bin beteiligt (eigene Figur
    // als Sprecher oder selbst Autor einer Nachricht) und die letzte
    // Nachricht ist nicht von mir.
    sql<{ slug: string; title: string; open: boolean; since: string }[]>`
      WITH letzte AS (
        SELECT DISTINCT ON (dm.archive_entry_id)
               dm.archive_entry_id, dm.author_user_id, dm.created_at
        FROM dialogue_messages dm
        WHERE dm.deleted_at IS NULL
        ORDER BY dm.archive_entry_id, dm.created_at DESC
      )
      SELECT ae.slug, ae.title, ae.dialogue_open AS open,
             letzte.created_at::text AS since
      FROM letzte
      JOIN archive_entries ae ON ae.id = letzte.archive_entry_id
      WHERE ae.deleted_at IS NULL AND ae.dialogue_open = true
        AND letzte.author_user_id IS DISTINCT FROM ${userId}
        AND EXISTS (
          SELECT 1 FROM dialogue_messages meins
          WHERE meins.archive_entry_id = ae.id
            AND meins.author_user_id = ${userId}
            AND meins.deleted_at IS NULL
        )
    `,
    // 3. Eigene Entwürfe, die liegengeblieben sind — über alle vier
    // Inhaltsarten hinweg.
    sql<
      { slug: string; title: string; kind: string; since: string }[]
    >`
      SELECT slug, title, 'archive_entry' AS kind, updated_at::text AS since
      FROM archive_entries
      WHERE owner_user_id = ${userId} AND is_draft = true AND deleted_at IS NULL
        AND updated_at < NOW() - ${`${DRAFT_STALE_DAYS} days`}::interval
      UNION ALL
      SELECT slug, title, 'mission', updated_at::text
      FROM missions
      WHERE owner_user_id = ${userId} AND is_draft = true AND deleted_at IS NULL
        AND updated_at < NOW() - ${`${DRAFT_STALE_DAYS} days`}::interval
    `,
  ]);

  const actions: PendingAction[] = [
    ...missions.map((m) => ({
      kind: "mission_log" as const,
      label: "Logbuch schreiben",
      subject: m.title,
      // Auf die Mission, nicht direkt ins Formular: von dort führt „Neues
      // Log" weiter, und man sieht zuerst, worüber man schreibt.
      href: missionHref(m.slug),
      since: m.since,
    })),
    ...dialogues.map((d) => ({
      kind: "dialogue_reply" as const,
      label: "Im Gespräch antworten",
      subject: d.title,
      href: d.open ? dialogueHref(d.slug) : archiveHref(d.slug),
      since: d.since,
    })),
    ...drafts.map((d) => ({
      kind: "draft" as const,
      label: "Entwurf liegt seit einer Woche",
      subject: d.title,
      href: d.kind === "mission" ? missionHref(d.slug) : archiveHref(d.slug),
      since: d.since,
    })),
  ];

  // Das Älteste zuerst: was am längsten aussteht, drängt am meisten.
  return actions.sort((a, b) => a.since.localeCompare(b.since));
}
