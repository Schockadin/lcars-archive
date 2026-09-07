import "server-only";
import { revalidateTag } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { EVENT_CATEGORIES } from "@/lib/timelineTypes";

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
  detail: string | null;
  category: string;
}

export class ManualEventError extends Error {}

const MAX_TITLE = 200;
const MAX_DETAIL = 2000;

// Prüft die Eingabe, bevor sie in die Datenbank geht. Exportiert, weil sich
// die Regeln ohne Datenbank prüfen lassen — die Fehlermeldungen sind das,
// was die eintragende Person zu sehen bekommt.
export function parseManualEvent(form: {
  date: string;
  title: string;
  detail: string;
  category: string;
}): ManualEventInput {
  const title = form.title.trim();
  if (title === "") throw new ManualEventError("Das Ereignis braucht einen Titel.");
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
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ManualEventError("Dieses Datum gibt es nicht.");
  }

  const category = form.category.trim();
  if (!EVENT_CATEGORIES.some((c) => c.key === category)) {
    throw new ManualEventError("Unbekannte Ereignisart.");
  }

  const detail = form.detail.trim();
  if (detail.length > MAX_DETAIL) {
    throw new ManualEventError(
      `Die Beschreibung ist zu lang (höchstens ${MAX_DETAIL} Zeichen).`,
    );
  }

  return {
    // Vierstellig speichern, damit die Sortierung als Text stimmt.
    date: `${String(year).padStart(4, "0")}-${date.slice(-5)}`,
    title,
    detail: detail === "" ? null : detail,
    category,
  };
}

export async function createManualEvent(
  input: ManualEventInput,
  createdBy: number,
): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO timeline_events
      (event_date, title, detail, category, source_type, source_slug, href,
       origin, created_by)
    VALUES (${input.date}, ${input.title}, ${input.detail}, ${input.category},
            NULL, NULL, '', 'manual', ${createdBy})
    RETURNING id
  `;
  revalidateTag(cacheTags.timeline, { expire: 0 });
  return row.id;
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
  if (rows.length > 0) revalidateTag(cacheTags.timeline, { expire: 0 });
  return rows.length > 0;
}
