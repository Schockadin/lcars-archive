import { describe, expect, it, vi } from "vitest";
import { insertUser } from "./helpers";
import {
  deleteUserImage,
  listUserImages,
  uploadUserImage,
} from "@/lib/userImages";
import { deleteUser } from "@/lib/users";

const objects = vi.hoisted(() => new Map<string, Buffer>());
vi.mock("@/lib/r2Backup", () => ({
  uploadAssetObjectToR2: vi.fn(async (key: string, body: Buffer) => {
    objects.set(key, body);
  }),
  deleteAssetObjectFromR2: vi.fn(async (key: string) => {
    objects.delete(key);
  }),
  assetPublicUrl: (key: string) => `https://assets.example.test/${key}`,
}));

describe("user image library", () => {
  it("keeps images scoped to their uploader and deletes the matching object", async () => {
    objects.clear();
    const owner = await insertUser();
    const other = await insertUser();
    const image = await uploadUserImage({
      ownerId: owner.id,
      fileName: "C:\\fakepath\\bruecke.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    expect(image.fileName).toBe("bruecke.png");
    expect(await listUserImages(other.id)).toEqual([]);
    expect(await listUserImages(owner.id)).toHaveLength(1);
    expect(await deleteUserImage(other.id, image.id)).toBe(false);
    expect(await deleteUserImage(owner.id, image.id)).toBe(true);
    expect(await listUserImages(owner.id)).toEqual([]);
    expect(objects.size).toBe(0);
  });

  it("imports a source image only once", async () => {
    objects.clear();
    const owner = await insertUser();
    const input = {
      ownerId: owner.id,
      fileName: "portrait.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      sourceImageKey:
        "character-portraits/123e4567-e89b-12d3-a456-426614174000.png",
    };
    const first = await uploadUserImage(input);
    const second = await uploadUserImage(input);
    expect(second.id).toBe(first.id);
    expect(objects.size).toBe(1);
  });

  it("removes stored image objects when the owner account is deleted", async () => {
    objects.clear();
    const owner = await insertUser();
    await uploadUserImage({
      ownerId: owner.id,
      fileName: "portrait.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    expect(objects.size).toBe(1);
    await deleteUser(owner.id);
    expect(objects.size).toBe(0);
    expect(await listUserImages(owner.id)).toEqual([]);
  });
});
