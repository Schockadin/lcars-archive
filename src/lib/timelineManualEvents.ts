import "server-only";
import { revalidateTag } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import {
  EVENT_CATEGORIES,
  isIsoDate,
  normalizeCategory,
} from "@/lib/timelineTypes";
import { purgeContentImagesFor } from "@/lib/contentImages";
import type { ManualEventForEdit } from "@/lib/timelineManualEventTypes";

// Ereignisse, die zu keinem Inhalt gehören.
//
// Bis v1.29.42 verlangte timeline_events eine Quelle: jedes Ereignis hing an
// einer Mission, einem Logbuch, einem Datenbank-Eintrag oder einer Figur. Ein
// Kampagnen-Meilenstein, der in keinem Eintrag steht („Der Vertrag von
// Algeron wird unterzeichnet"), hatte damit kein Zuhause — außer man legte
// eigens einen Datenbank-Eintrag dafür an, nur damit die Chronologie ihn
// zeigen kann.
//
// Solche Ereignisse liegen in derselben Tabelle wie die abgeleiteten, aber
// mit origin 'manual' und leerer Quelle. Sie erscheinen deshalb auch in der
// Liste der Spielleitung (/gm/chronologie) und lassen sich dort entfernen.

export interface ManualEventInput {
  date: string;
  title: string;
  teaser: string | null;
  detail: string | null;
  category: string;
  // Wer beteiligt ist. Bewusst OHNE Vorauswahl: ein freies Ereignis betrifft
  // in der Regel niemanden aus der Runde, und wenn doch, dann gezielt.
  characterIds: number[];
}

export class ManualEventError extends Error {}

const MAX_TITLE = 200;
const MAX_TEASER = 500;
const MAX_DETAIL = 10_000;

// Prüft die Eingabe, bevor sie in die Datenbank geht. Exportiert, weil sich
// die Regeln ohne Datenbank prüfen lassen — die Fehlermeldungen sind das,
// was die eintragende Person zu sehen bekommt.
export function parseManualEvent(form: {
  date: string;
  title: string;
  teaser: string;
  detail: string;
  category: string;
  characterIds?: string[];
}): ManualEventInput {
  const title = form.title.trim();
  if (title === "")
    throw new ManualEventError("Das Ereignis braucht einen Titel.");
  if (title.length > MAX_TITLE) {
    throw new ManualEventError(
      `Der Titel ist zu lang (höchstens ${MAX_TITLE} Zeichen).`,
    );
  }

  // Das Datum ist die Achse des Zeitstrahls — ohne gültiges Datum gehört das
  // Ereignis nirgendwohin. Die Jahreszahl bleibt bewusst offen: die Kampagne
  // spielt im 25. Jahrhundert, und Rückblenden reichen weit zurück.
  const date = form.date.trim();
  if (!/^\d{3,4}-\d{2}-\d{2}$/.test(date)) {
    throw new ManualEventError("Bitte ein Datum im Format JJJJ-MM-TT angeben.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const normalizedDate = [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
  if (!isIsoDate(normalizedDate)) {
    throw new ManualEventError("Dieses Datum gibt es nicht.");
  }

  const category = normalizeCategory(form.category);
  if (!EVENT_CATEGORIES.some((c) => c.key === category)) {
    throw new ManualEventError("Unbekannte Ereignisart.");
  }

  const detail = form.detail.trim();
  const teaser = form.teaser.trim();
  if (teaser.length > MAX_TEASER) {
    throw new ManualEventError(
      `Der Teaser ist zu lang (höchstens ${MAX_TEASER} Zeichen).`,
    );
  }
  if (detail.length > MAX_DETAIL) {
    throw new ManualEventError(
      `Die Beschreibung ist zu lang (höchstens ${MAX_DETAIL} Zeichen).`,
    );
  }

  const characterIds: number[] = [];
  for (const raw of form.characterIds ?? []) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ManualEventError("Ungültige Auswahl der Beteiligten.");
    }
    if (!characterIds.includes(id)) characterIds.push(id);
  }

  return {
    // Vierstellig speichern, damit die Sortierung als Text stimmt.
    date: normalizedDate,
    title,
    teaser: teaser === "" ? null : teaser,
    detail: detail === "" ? null : detail,
    category,
    characterIds,
  };
}

export async function createManualEvent(
  input: ManualEventInput,
  createdBy: number,
): Promise<number> {
  return (await createManualEvents([input], createdBy))[0];
}

// CSV-Importe werden als ein Batch geschrieben: Ist eine Zeile technisch
// nicht speicherbar, bleibt nicht die Hälfte der Datei in der Chronologie.
export async function createManualEvents(
  inputs: ManualEventInput[],
  createdBy: number,
): Promise<number[]> {
  const ids = await sql.begin(async (tx) => {
    const created: number[] = [];
    for (const input of inputs) {
      const [row] = await tx<{ id: number }[]>`
        INSERT INTO timeline_events
          (event_date, title, teaser, detail, category, source_type, source_slug, href,
           origin, created_by)
        VALUES (${input.date}, ${input.title}, ${input.teaser}, ${input.detail},
                ${input.category}, NULL, NULL, '', 'manual', ${createdBy})
        RETURNING id
      `;
      for (const characterId of input.characterIds) {
        await tx`
          INSERT INTO timeline_event_characters (event_id, character_id)
          VALUES (${row.id}, ${characterId})
          ON CONFLICT DO NOTHING
        `;
      }
      created.push(row.id);
    }
    return created;
  });
  revalidateTag(cacheTags.timeline, { expire: 0 });
  return ids;
}

// Eigene freie Ereignisse bilden auf /user/content eine fünfte Inhaltsart.
// Anders als abgeleitete Timeline-Einträge haben sie keinen eigenen Inhalt
// als Quelle; deshalb kommen Bearbeiten und Löschen direkt an diese Liste.
export async function listManualEventsForUser(
  userId: number,
): Promise<ManualEventForEdit[]> {
  return sql<ManualEventForEdit[]>`
    SELECT te.id,
           to_char(te.event_date, 'YYYY-MM-DD') AS date,
           te.title,
           te.teaser,
           te.detail,
           te.category,
           ARRAY(
             SELECT tec.character_id
             FROM timeline_event_characters tec
             JOIN characters c ON c.id = tec.character_id
             WHERE tec.event_id = te.id
             ORDER BY c.name ASC
           ) AS "characterIds",
           ARRAY(
             SELECT c.name
             FROM timeline_event_characters tec
             JOIN characters c ON c.id = tec.character_id
             WHERE tec.event_id = te.id
             ORDER BY c.name ASC
           ) AS "characterNames"
    FROM timeline_events te
    WHERE te.origin = 'manual' AND te.created_by = ${userId}
    ORDER BY te.event_date DESC, te.title ASC
  `;
}

export async function updateManualEvent(
  id: number,
  input: ManualEventInput,
  viewer: { userId: number; canModerate: boolean },
): Promise<boolean> {
  const updated = await sql.begin(async (tx) => {
    const rows = await tx<{ id: number }[]>`
      UPDATE timeline_events
      SET event_date = ${input.date},
          title = ${input.title},
          teaser = ${input.teaser},
          detail = ${input.detail},
          category = ${input.category}
      WHERE id = ${id} AND origin = 'manual'
        AND (${viewer.canModerate} OR created_by = ${viewer.userId})
      RETURNING id
    `;
    if (rows.length === 0) return false;

    await tx`
      DELETE FROM timeline_event_characters WHERE event_id = ${id}
    `;
    for (const characterId of input.characterIds) {
      await tx`
        INSERT INTO timeline_event_characters (event_id, character_id)
        VALUES (${id}, ${characterId})
        ON CONFLICT DO NOTHING
      `;
    }
    return true;
  });
  if (updated) revalidateTag(cacheTags.timeline, { expire: 0 });
  return updated;
}

// Alle Figuren, die sich mit einem Ereignis verknüpfen lassen: das ganze
// Ensemble, ausdrücklich auch zurückgezogene und NPCs — ein historisches
// Ereignis betrifft oft gerade die, die nicht mehr im Dienst sind. Draußen
// bleiben nur Entwürfe (noch nicht veröffentlicht) und Gelöschtes.
export async function listCharactersForEvents(): Promise<
  { id: number; name: string }[]
> {
  return sql<{ id: number; name: string }[]>`
    SELECT id, name FROM characters
    WHERE deleted_at IS NULL AND is_draft = false
    ORDER BY name ASC
  `;
}

// Entfernen darf, wer es eingetragen hat — und wer fremde Inhalte moderieren
// darf (dieselbe Regel wie überall sonst). Gibt zurück, ob etwas entfernt
// wurde: false heißt „gibt es nicht (mehr) oder gehört jemand anderem".
export async function deleteManualEvent(
  id: number,
  viewer: { userId: number; canModerate: boolean },
): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    DELETE FROM timeline_events
    WHERE id = ${id} AND origin = 'manual'
      AND (${viewer.canModerate} OR created_by = ${viewer.userId})
    RETURNING id
  `;
  if (rows.length > 0) {
    await purgeContentImagesFor("timeline_event", id);
    revalidateTag(cacheTags.timeline, { expire: 0 });
  }
  return rows.length > 0;
}
