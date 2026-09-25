import { beforeEach, describe, expect, it, vi } from "vitest";
import sql from "@/lib/db";
import {
  deleteCharacterDocument,
  renameCharacterDocument,
  uploadCharacterDocument,
} from "@/lib/characterDocuments";
import { insertCharacter, insertUser } from "./helpers";

const r2 = vi.hoisted(() => ({
  objects: new Map<string, Buffer>(),
  failDelete: false,
}));

vi.mock("@/lib/r2Backup", () => ({
  uploadObjectBytesToR2: vi.fn(
    async (key: string, body: Buffer) => void r2.objects.set(key, body),
  ),
  getObjectBytesFromR2: vi.fn(async (key: string) => {
    const body = r2.objects.get(key);
    return body ? { body, contentType: "text/plain" } : null;
  }),
  deleteObjectFromR2: vi.fn(async (key: string) => {
    if (r2.failDelete) throw new Error("R2 vorübergehend nicht erreichbar");
    r2.objects.delete(key);
  }),
}));

describe("Charakterdokumente", () => {
  beforeEach(() => {
    r2.objects.clear();
    r2.failDelete = false;
  });

  it("behält den auffindbaren DB-Eintrag, wenn das Löschen in R2 scheitert", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });
    const document = await uploadCharacterDocument(
      character.id,
      user.id,
      "notiz.txt",
      Buffer.from("Geheime Notiz", "utf8"),
    );

    r2.failDelete = true;
    await expect(
      deleteCharacterDocument(character.id, document.id),
    ).rejects.toThrow(/R2/);
    expect(
      await sql`SELECT id FROM character_documents WHERE id = ${document.id}`,
    ).toHaveLength(1);
    expect(r2.objects.size).toBe(1);

    r2.failDelete = false;
    await expect(
      deleteCharacterDocument(character.id, document.id),
    ).resolves.toBe(true);
    expect(
      await sql`SELECT id FROM character_documents WHERE id = ${document.id}`,
    ).toHaveLength(0);
    expect(r2.objects.size).toBe(0);
  });

  it("benennt nur das Dokument des angegebenen Charakters um", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });
    const otherCharacter = await insertCharacter({ playerId: user.id });
    const document = await uploadCharacterDocument(
      character.id,
      user.id,
      "alter-name.txt",
      Buffer.from("Geheime Notiz", "utf8"),
    );
    const [before] = await sql<{ r2_key: string }[]>`
      SELECT r2_key FROM character_documents WHERE id = ${document.id}
    `;

    await expect(
      renameCharacterDocument(
        otherCharacter.id,
        document.id,
        "falscher-name.txt",
      ),
    ).resolves.toBeNull();
    await expect(
      renameCharacterDocument(character.id, document.id, "neuer-name.txt"),
    ).resolves.toBe("neuer-name.txt");

    const [after] = await sql<{ file_name: string; r2_key: string }[]>`
      SELECT file_name, r2_key
      FROM character_documents
      WHERE id = ${document.id}
    `;
    expect(after).toEqual({
      file_name: "neuer-name.txt",
      r2_key: before.r2_key,
    });
    await expect(
      renameCharacterDocument(character.id, document.id, "name.pdf"),
    ).rejects.toThrow(/\.txt/);
  });
});
