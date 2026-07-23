import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  purgeExpiredSoftDeletedContent,
  purgeContentById,
} from "@/lib/purgeContent";
import { deleteCharacter } from "@/lib/characters";
import { insertCharacter, insertUser } from "./helpers";

// Setzt deleted_at direkt auf einen Zeitpunkt in der Vergangenheit — die
// deleteCharacter/deleteMission/... Funktionen setzen immer NOW(), ein Test
// des 7-Tage-Cutoffs braucht aber einen tatsächlich abgelaufenen Zeitstempel.
async function backdateCharacterDeletion(characterId: number, daysAgo: number) {
  await sql`
    UPDATE characters
    SET deleted_at = NOW() - (${daysAgo} * INTERVAL '1 day')
    WHERE id = ${characterId}
  `;
}

describe("purgeExpiredSoftDeletedContent", () => {
  it("removes only soft-deleted rows older than the retention window", async () => {
    const admin = await insertUser({ role: "admin" });
    const stale = await insertCharacter({ name: "Längst gelöscht" });
    const recent = await insertCharacter({ name: "Kürzlich gelöscht" });
    const live = await insertCharacter({ name: "Noch aktiv" });

    await deleteCharacter(stale.id, admin.id);
    await backdateCharacterDeletion(stale.id, 10);
    await deleteCharacter(recent.id, admin.id);

    const result = await purgeExpiredSoftDeletedContent(7);

    expect(result.characters).toBeGreaterThanOrEqual(1);
    const rows = await sql<{ id: number }[]>`
      SELECT id FROM characters WHERE id = ANY(${[stale.id, recent.id, live.id]})
    `;
    const remainingIds = rows.map((r) => r.id);
    expect(remainingIds).not.toContain(stale.id);
    expect(remainingIds).toContain(recent.id);
    expect(remainingIds).toContain(live.id);
  });
});

describe("purgeContentById", () => {
  it("purges a soft-deleted character immediately, regardless of age", async () => {
    const admin = await insertUser({ role: "admin" });
    const character = await insertCharacter({ name: "Sofort löschen" });
    await deleteCharacter(character.id, admin.id);

    const purged = await purgeContentById("character", character.id);

    expect(purged).toBe(true);
    const [row] = await sql`SELECT id FROM characters WHERE id = ${character.id}`;
    expect(row).toBeUndefined();
  });

  it("refuses to purge a character that is not soft-deleted", async () => {
    const character = await insertCharacter({ name: "Noch nicht gelöscht" });

    const purged = await purgeContentById("character", character.id);

    expect(purged).toBe(false);
    const [row] = await sql`SELECT id FROM characters WHERE id = ${character.id}`;
    expect(row).toBeDefined();
  });
});
