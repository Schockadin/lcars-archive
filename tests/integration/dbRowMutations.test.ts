import { describe, expect, it } from "vitest";
import sql from "@/lib/db";
import {
  getTableColumnInfoInTransaction,
  lockDbRowSnapshot,
  restoreDbRowSnapshot,
} from "@/lib/dbRowMutations";
import { insertCharacter } from "./helpers";

describe("DB-Zeilen-Schnappschüsse", () => {
  it("stellt geänderte Spalten wieder her und unterscheidet SQL NULL von JSON null", async () => {
    const character = await insertCharacter({ name: "Vorher" });
    const columns = ["name", "metadata"];

    await sql.begin(async (tx) => {
      await tx.unsafe(`UPDATE characters SET metadata = NULL WHERE id = $1`, [
        character.id,
      ]);
      const columnInfo = await getTableColumnInfoInTransaction(
        tx,
        "characters",
      );
      const typeMap = new Map(
        columnInfo.map((column) => [column.name, column.dataType]),
      );
      const [beforeSqlNull] = await lockDbRowSnapshot(
        tx,
        "characters",
        "id",
        String(character.id),
        columns,
      );

      await tx.unsafe(
        `UPDATE characters SET name = $1, metadata = $2::jsonb WHERE id = $3`,
        ["Nachher", "null", character.id],
      );
      const [afterJsonNull] = await lockDbRowSnapshot(
        tx,
        "characters",
        "id",
        String(character.id),
        columns,
      );
      expect(beforeSqlNull.sqlNulls.metadata).toBe(true);
      expect(afterJsonNull.sqlNulls.metadata).toBe(false);
      expect(afterJsonNull.values.metadata).toBeNull();

      await restoreDbRowSnapshot(
        tx,
        "characters",
        "id",
        String(character.id),
        columns,
        typeMap,
        beforeSqlNull,
      );

      await tx.unsafe(
        `UPDATE characters SET metadata = $1::jsonb WHERE id = $2`,
        ["null", character.id],
      );
      const [beforeJsonNull] = await lockDbRowSnapshot(
        tx,
        "characters",
        "id",
        String(character.id),
        columns,
      );
      await tx.unsafe(
        `UPDATE characters SET metadata = $1::jsonb WHERE id = $2`,
        ['{"restored":true}', character.id],
      );
      await restoreDbRowSnapshot(
        tx,
        "characters",
        "id",
        String(character.id),
        columns,
        typeMap,
        beforeJsonNull,
      );
    });

    const [restored] = await sql<
      { name: string; metadata: unknown; metadata_is_sql_null: boolean }[]
    >`
      SELECT name, metadata, metadata IS NULL AS metadata_is_sql_null
      FROM characters WHERE id = ${character.id}
    `;
    expect(restored.name).toBe("Vorher");
    expect(restored.metadata_is_sql_null).toBe(false);
    expect(restored.metadata).toBeNull();
  });
});
