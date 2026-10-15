import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, getTableColumns, getTableName } from "drizzle-orm";
import orm from "@/lib/orm";
import sql from "@/lib/db";
import {
  campaignSettings,
  characterDocuments,
  characters,
  contentImages,
  userImages,
  users,
} from "@/lib/ormSchema";
import { insertUser } from "./helpers";
import { getSessionDefaults, saveSessionDefaults } from "@/lib/sessionDefaults";
import { DEFAULT_SESSION_DEFAULTS } from "@/lib/sessionDefaultsFormat";

describe("Drizzle auf dem bestehenden PostgreSQL-Schema", () => {
  it("findet alle modellierten Spalten im SQL-Basisschema", async () => {
    for (const table of [
      users,
      characters,
      characterDocuments,
      contentImages,
      userImages,
      campaignSettings,
    ]) {
      const name = getTableName(table);
      const expected = Object.values(getTableColumns(table)).map(
        (column) => column.name,
      );
      const rows = await sql<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${name}
      `;
      expect(rows.map((row) => row.column_name)).toEqual(
        expect.arrayContaining(expected),
      );
    }
  });

  it("nutzt den vorhandenen Client und rollt eine Transaktion zurück", async () => {
    const owner = await insertUser();
    const key = `user-images/test/${randomUUID()}.png`;
    await expect(
      orm.transaction(async (tx) => {
        await tx.insert(userImages).values({
          ownerId: owner.id,
          r2Key: key,
          fileName: "rollback.png",
          contentMime: "image/png",
          sizeBytes: 4,
        });
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(
      await orm
        .select({ id: userImages.id })
        .from(userImages)
        .where(eq(userImages.r2Key, key)),
    ).toEqual([]);
  });

  it("liest und überschreibt die kampagnenweiten Terminvorlagen", async () => {
    expect(await getSessionDefaults()).toEqual(DEFAULT_SESSION_DEFAULTS);
    const first = {
      weekday: 3,
      weekParity: "even" as const,
      time: "19:30",
      location: "Brücke",
    };
    await saveSessionDefaults(first);
    expect(await getSessionDefaults()).toEqual(first);
    await saveSessionDefaults({ ...first, location: "Holodeck" });
    expect((await getSessionDefaults()).location).toBe("Holodeck");
  });
});
