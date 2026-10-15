import { describe, expect, it, vi } from "vitest";
import sql from "@/lib/db";
import { makeViewer } from "@/lib/visibility";
import { getCharacterDocumentAccess } from "@/lib/characterDocuments";
import {
  deleteUserDocument,
  editUserDocument,
  listUserCharacterFiles,
  uploadUserDocument,
} from "@/lib/userFiles";
import { listUserImageReferences } from "@/lib/userImageReferences";
import { insertCharacter, insertUser } from "./helpers";

const { uploadObjectBytesToR2, deleteObjectFromR2 } = vi.hoisted(() => ({
  uploadObjectBytesToR2: vi.fn().mockResolvedValue(undefined),
  deleteObjectFromR2: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/r2Backup", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/r2Backup")>()),
  uploadObjectBytesToR2,
  deleteObjectFromR2,
}));

describe("persönliche Dateien", () => {
  it("bewahrt Dokumente ohne Charakter auf und erlaubt spätere Zuordnung", async () => {
    const owner = await insertUser();
    const other = await insertUser();
    const ownCharacter = await insertCharacter({ playerId: owner.id });
    const foreignCharacter = await insertCharacter({ playerId: other.id });

    await uploadUserDocument({
      userId: owner.id,
      characterId: null,
      fileName: "akte.txt",
      buffer: Buffer.from("Inhalt"),
    });
    const [unassigned] = await listUserCharacterFiles(owner.id);
    expect(unassigned.characterId).toBeNull();
    expect(unassigned.characterName).toBeNull();
    expect(await listUserCharacterFiles(other.id)).toEqual([]);
    expect((await getCharacterDocumentAccess(unassigned.id))?.fileOwnerId).toBe(
      owner.id,
    );
    await expect(
      editUserDocument(owner.id, unassigned.id, "neu.txt", foreignCharacter.id),
    ).rejects.toThrow("Charakter nicht gefunden");

    expect(
      await editUserDocument(
        owner.id,
        unassigned.id,
        "neu.txt",
        ownCharacter.id,
      ),
    ).toBe("neu.txt");
    const [assigned] = await listUserCharacterFiles(owner.id);
    expect(assigned.characterId).toBe(ownCharacter.id);
    expect(await editUserDocument(owner.id, assigned.id, "neu.txt", null)).toBe(
      "neu.txt",
    );
    expect((await listUserCharacterFiles(owner.id))[0].characterId).toBeNull();

    expect(await deleteUserDocument(other.id, unassigned.id)).toBe(false);
    expect(await deleteUserDocument(owner.id, unassigned.id)).toBe(true);
    expect(deleteObjectFromR2).toHaveBeenCalledOnce();
    expect(await listUserCharacterFiles(owner.id)).toEqual([]);
  });

  it("zeigt Bildverweise nur in sichtbaren Einträgen", async () => {
    const owner = await insertUser();
    const other = await insertUser();
    const key = `user-images/${owner.id}/bild.png`;
    const [image] = await sql<{ id: number }[]>`
      INSERT INTO user_images (owner_id, r2_key, file_name, content_mime, size_bytes)
      VALUES (${owner.id}, ${key}, 'bild.png', 'image/png', 4)
      RETURNING id
    `;
    const visible = await insertCharacter({ playerId: owner.id });
    const hidden = await insertCharacter({ playerId: other.id, isDraft: true });
    await sql`UPDATE characters SET bio = ${`![Bild](https://assets.example/${key})`} WHERE id = ${visible.id}`;
    await sql`UPDATE characters SET bio = ${`![Bild](https://assets.example/${key})`} WHERE id = ${hidden.id}`;

    const linked = await listUserImageReferences(
      owner.id,
      makeViewer(owner.id, ["player"]),
    );
    expect(linked[image.id]).toEqual([
      { label: "Test Character", href: `/characters/${visible.slug}` },
    ]);

    const sourceKey = `content-images/${owner.id}/original.png`;
    const [source] = await sql<{ id: number }[]>`
      INSERT INTO content_images
        (content_type, content_id, r2_key, content_mime, size_bytes, uploaded_by)
      VALUES ('character', ${visible.id}, ${sourceKey}, 'image/png', 4, ${owner.id})
      RETURNING id
    `;
    await sql`UPDATE user_images SET source_image_key = ${sourceKey} WHERE id = ${image.id}`;
    await sql`
      UPDATE characters SET bio = ${`![Bild](/api/content-images/${source.id})`}
      WHERE id = ${visible.id}
    `;
    expect(
      (
        await listUserImageReferences(
          owner.id,
          makeViewer(owner.id, ["player"]),
        )
      )[image.id],
    ).toEqual([
      { label: "Test Character", href: `/characters/${visible.slug}` },
    ]);
  });
});
