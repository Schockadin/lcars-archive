import "server-only";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import postgres from "postgres";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { byFocusOrder, type Focus, type FocusInput } from "@/lib/focusCatalog";

// Datenzugriff auf den Schwerpunkt-Katalog (Tabelle focuses, siehe
// scripts/schema.sql). Die reine Hälfte — Disziplinen, Labels, Validierung —
// liegt in src/lib/focusCatalog.ts. Aufgebaut wie src/lib/talents.ts.

export class FocusNameTakenError extends Error {}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof postgres.PostgresError && err.code === "23505";
}

const SELECT_COLUMNS = sql`
  id, name, discipline, description, is_custom AS "isCustom"
`;

// Der ganze Katalog. Gecacht: er ändert sich nur über /gm/focuses und wird auf
// jedem Charakterbogen als Auswahlliste gebraucht.
export async function listFocuses(): Promise<Focus[]> {
  "use cache";
  cacheTag(cacheTags.focuses);
  cacheLife("max");
  const rows = await sql<Focus[]>`
    SELECT ${SELECT_COLUMNS} FROM focuses
  `;
  return rows.sort(byFocusOrder);
}

// Ungecachte Variante für die Bearbeitungsseite der Spielleitung — dort muss
// eine gerade gespeicherte Änderung sofort sichtbar sein (wie bei den
// Talenten, siehe listTalentsFresh).
export async function listFocusesFresh(): Promise<Focus[]> {
  const rows = await sql<Focus[]>`
    SELECT ${SELECT_COLUMNS} FROM focuses
  `;
  return rows.sort(byFocusOrder);
}

export async function createFocus(
  input: FocusInput,
  createdByUserId: number,
): Promise<Focus> {
  try {
    const [row] = await sql<Focus[]>`
      INSERT INTO focuses (name, discipline, description, is_custom, created_by)
      VALUES (${input.name}, ${input.discipline}, ${input.description},
              TRUE, ${createdByUserId})
      RETURNING ${SELECT_COLUMNS}
    `;
    revalidateTag(cacheTags.focuses, { expire: 0 });
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new FocusNameTakenError(input.name);
    }
    throw err;
  }
}

// Bearbeiten. Wie bei den Talenten sind auch die importierten Einträge
// änderbar — die Runde weicht an einigen Stellen vom Regeltext ab.
// is_custom bleibt dabei unverändert.
export async function updateFocus(
  id: number,
  input: FocusInput,
): Promise<boolean> {
  try {
    const rows = await sql`
      UPDATE focuses
      SET name = ${input.name}, discipline = ${input.discipline},
          description = ${input.description}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
    revalidateTag(cacheTags.focuses, { expire: 0 });
    return rows.length > 0;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new FocusNameTakenError(input.name);
    }
    throw err;
  }
}

// Löschen ist bewusst nur für selbst angelegte Schwerpunkte vorgesehen: einen
// importierten zu entfernen, würde Charakterbögen entwerten, auf denen er
// bereits steht.
export async function deleteCustomFocus(id: number): Promise<boolean> {
  const rows = await sql`
    DELETE FROM focuses WHERE id = ${id} AND is_custom = TRUE RETURNING id
  `;
  revalidateTag(cacheTags.focuses, { expire: 0 });
  return rows.length > 0;
}
