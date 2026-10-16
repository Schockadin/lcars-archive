import { describe, expect, it } from "vitest";
import sql from "@/lib/db";
import {
  getTableColumnInfoInTransaction,
  lockDbRowSnapshot,
  restoreDbRowSnapshot,
} from "@/lib/dbRowMutations";

describe("DB-Zeilen-Schnappschüsse", () => {
  it("stellt geänderte Spalten wieder her und unterscheidet SQL NULL von JSON null", async () => {
    await sql`INSERT INTO campaign_settings (id) VALUES (TRUE)`;
    const columns = ["ingame_year", "advancement_rules"];

    await sql.begin(async (tx) => {
      await tx`UPDATE campaign_settings SET advancement_rules = NULL WHERE id = TRUE`;
      const columnInfo = await getTableColumnInfoInTransaction(
        tx,
        "campaign_settings",
      );
      const typeMap = new Map(
        columnInfo.map((column) => [column.name, column.dataType]),
      );
      const [beforeSqlNull] = await lockDbRowSnapshot(
        tx,
        "campaign_settings",
        "id",
        "true",
        columns,
      );

      await tx.unsafe(
        `UPDATE campaign_settings SET ingame_year = $1, advancement_rules = $2::jsonb WHERE id = TRUE`,
        [2402, "null"],
      );
      const [afterJsonNull] = await lockDbRowSnapshot(
        tx,
        "campaign_settings",
        "id",
        "true",
        columns,
      );
      expect(beforeSqlNull.sqlNulls.advancement_rules).toBe(true);
      expect(afterJsonNull.sqlNulls.advancement_rules).toBe(false);
      expect(afterJsonNull.values.advancement_rules).toBeNull();

      await restoreDbRowSnapshot(
        tx,
        "campaign_settings",
        "id",
        "true",
        columns,
        typeMap,
        beforeSqlNull,
      );

      await tx.unsafe(
        `UPDATE campaign_settings SET advancement_rules = $1::jsonb WHERE id = TRUE`,
        ["null"],
      );
      const [beforeJsonNull] = await lockDbRowSnapshot(
        tx,
        "campaign_settings",
        "id",
        "true",
        columns,
      );
      await tx.unsafe(
        `UPDATE campaign_settings SET advancement_rules = $1::jsonb WHERE id = TRUE`,
        ['{"restored":true}'],
      );
      await restoreDbRowSnapshot(
        tx,
        "campaign_settings",
        "id",
        "true",
        columns,
        typeMap,
        beforeJsonNull,
      );
    });

    const [restored] = await sql<
      {
        ingame_year: number | null;
        advancement_rules: unknown;
        rules_is_sql_null: boolean;
      }[]
    >`
      SELECT ingame_year, advancement_rules,
             advancement_rules IS NULL AS rules_is_sql_null
      FROM campaign_settings WHERE id = TRUE
    `;
    expect(restored.ingame_year).toBeNull();
    expect(restored.rules_is_sql_null).toBe(false);
    expect(restored.advancement_rules).toBeNull();
  });
});
