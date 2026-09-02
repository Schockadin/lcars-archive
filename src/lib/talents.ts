import "server-only";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import postgres from "postgres";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { byTalentOrder, type Talent, type TalentInput } from "@/lib/talentCatalog";

// Datenzugriff auf den Talent-Katalog (Tabelle talents, siehe
// scripts/schema.sql). Die reine Hälfte — Kategorien, Labels, Validierung —
// liegt in src/lib/talentCatalog.ts.

export class TalentNameTakenError extends Error {}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof postgres.PostgresError && err.code === "23505";
}

const SELECT_COLUMNS = sql`
  id, name, category, requirement, description,
  is_custom AS "isCustom"
`;

// Der ganze Katalog. Gecacht: er ändert sich nur über /gm/talents und wird auf
// jedem Charakterbogen als Auswahlliste gebraucht.
export async function listTalents(): Promise<Talent[]> {
  "use cache";
  cacheTag(cacheTags.talents);
  cacheLife("max");
  const rows = await sql<Talent[]>`
    SELECT ${SELECT_COLUMNS} FROM talents
  `;
  return rows.sort(byTalentOrder);
}

// Ungecachte Variante für die Bearbeitungsseite der Spielleitung: dort muss
// eine gerade gespeicherte Änderung sofort sichtbar sein, auch wenn die
// Revalidierung des Tags noch nicht überall durchgeschlagen ist.
export async function listTalentsFresh(): Promise<Talent[]> {
  const rows = await sql<Talent[]>`
    SELECT ${SELECT_COLUMNS} FROM talents
  `;
  return rows.sort(byTalentOrder);
}

export async function createTalent(
  input: TalentInput,
  createdByUserId: number,
): Promise<Talent> {
  try {
    const [row] = await sql<Talent[]>`
      INSERT INTO talents (name, category, requirement, description, is_custom, created_by)
      VALUES (${input.name}, ${input.category}, ${input.requirement},
              ${input.description}, TRUE, ${createdByUserId})
      RETURNING ${SELECT_COLUMNS}
    `;
    revalidateTag(cacheTags.talents, { expire: 0 });
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new TalentNameTakenError(input.name);
    }
    throw err;
  }
}

// Bearbeiten. Auch die importierten Talente sind änderbar — die Runde weicht
// an einigen Stellen vom Regeltext ab, und eine Kopie anzulegen wäre für die
// Auswahlliste nur verwirrend. is_custom bleibt dabei unverändert.
export async function updateTalent(
  id: number,
  input: TalentInput,
): Promise<boolean> {
  try {
    const rows = await sql`
      UPDATE talents
      SET name = ${input.name}, category = ${input.category},
          requirement = ${input.requirement}, description = ${input.description},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
    revalidateTag(cacheTags.talents, { expire: 0 });
    return rows.length > 0;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new TalentNameTakenError(input.name);
    }
    throw err;
  }
}

// Löschen ist bewusst nur für selbst angelegte Talente vorgesehen: ein
// importiertes Talent zu entfernen, würde Charakterbögen entwerten, auf denen
// es bereits steht.
export async function deleteCustomTalent(id: number): Promise<boolean> {
  const rows = await sql`
    DELETE FROM talents WHERE id = ${id} AND is_custom = TRUE RETURNING id
  `;
  revalidateTag(cacheTags.talents, { expire: 0 });
  return rows.length > 0;
}
