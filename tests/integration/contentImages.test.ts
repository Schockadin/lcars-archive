import { describe, it, expect, vi } from "vitest";
import { insertUser, insertCharacter, insertMission } from "./helpers";
import {
  uploadContentImage,
  listContentImages,
  getContentImageById,
  getContentImageBytes,
  deleteContentImage,
  getContentAccessContext,
  canManageContentImages,
  InvalidContentImageError,
} from "@/lib/contentImages";
import { makeViewer } from "@/lib/visibility";

// r2Backup.ts braucht echte R2_*-Credentials (S3Client) — hier durch eine
// In-Memory-"Bucket"-Map ersetzt, damit sich die DB+R2-Orchestrierung in
// contentImages.ts ohne echte Cloudflare-Anbindung testen lässt (gleiches
// Prinzip wie next/headers-Mocks in adminEditActions.test.ts). Kein
// bestehender R2-Test in diesem Repo mockt das bereits — dies ist der erste.
// vi.hoisted, da vi.mock selbst über die Imports oben hinaus gehoben wird —
// ohne vi.hoisted würde die Mock-Factory beim Ausführen auf ein noch nicht
// initialisiertes fakeBucket treffen (gleiches Muster wie cookieStore in
// adminEditActions.test.ts).
const fakeBucket = vi.hoisted(
  () => new Map<string, { body: Buffer; contentType: string }>(),
);
vi.mock("@/lib/r2Backup", () => ({
  uploadObjectToR2: vi.fn(async (key: string, body: Buffer, contentType: string) => {
    fakeBucket.set(key, { body, contentType });
  }),
  getObjectBytesFromR2: vi.fn(async (key: string) => fakeBucket.get(key) ?? null),
  deleteObjectFromR2: vi.fn(async (key: string) => {
    fakeBucket.delete(key);
  }),
}));

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("uploadContentImage", () => {
  it("stores the image in R2 and a matching content_images row", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });

    const image = await uploadContentImage(
      "character",
      character.id,
      { buffer: PNG_BYTES, mimeType: "image/png" },
      user.id,
    );

    expect(image.contentType).toBe("character");
    expect(image.contentId).toBe(character.id);
    expect(image.sizeBytes).toBe(PNG_BYTES.byteLength);
    expect(image.uploadedBy).toBe(user.id);

    const bytes = await getContentImageBytes(image.id);
    expect(bytes?.body.equals(PNG_BYTES)).toBe(true);
    expect(bytes?.contentType).toBe("image/png");
  });

  it("rejects an unsupported mime type", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });

    await expect(
      uploadContentImage(
        "character",
        character.id,
        { buffer: PNG_BYTES, mimeType: "application/pdf" },
        user.id,
      ),
    ).rejects.toThrow(InvalidContentImageError);
  });

  it("rejects an empty file", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });

    await expect(
      uploadContentImage(
        "character",
        character.id,
        { buffer: Buffer.alloc(0), mimeType: "image/png" },
        user.id,
      ),
    ).rejects.toThrow(InvalidContentImageError);
  });

  it("rejects a file over the size limit", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });
    const oversized = Buffer.alloc(6 * 1024 * 1024);

    await expect(
      uploadContentImage(
        "character",
        character.id,
        { buffer: oversized, mimeType: "image/png" },
        user.id,
      ),
    ).rejects.toThrow(InvalidContentImageError);
  });
});

describe("listContentImages / deleteContentImage", () => {
  it("lists images oldest first and removes them from R2 on delete", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });

    const first = await uploadContentImage(
      "character",
      character.id,
      { buffer: PNG_BYTES, mimeType: "image/png" },
      user.id,
    );
    const second = await uploadContentImage(
      "character",
      character.id,
      { buffer: PNG_BYTES, mimeType: "image/webp" },
      user.id,
    );

    const listed = await listContentImages("character", character.id);
    expect(listed.map((i) => i.id)).toEqual([first.id, second.id]);

    const deleted = await deleteContentImage("character", character.id, first.id);
    expect(deleted).toBe(true);
    expect(await getContentImageById(first.id)).toBeNull();
    expect(await getContentImageBytes(first.id)).toBeNull();
  });

  it("refuses to delete an image belonging to a different content item", async () => {
    const user = await insertUser();
    const characterA = await insertCharacter({ playerId: user.id });
    const characterB = await insertCharacter({ playerId: user.id });

    const image = await uploadContentImage(
      "character",
      characterA.id,
      { buffer: PNG_BYTES, mimeType: "image/png" },
      user.id,
    );

    const deleted = await deleteContentImage("character", characterB.id, image.id);
    expect(deleted).toBe(false);
    expect(await getContentImageById(image.id)).not.toBeNull();
  });
});

describe("getContentAccessContext", () => {
  it("returns visibility + owner for a character", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id, visibility: "gm" });

    const access = await getContentAccessContext("character", character.id);
    expect(access).toEqual({ visibility: "gm", ownerId: user.id });
  });

  it("treats missions as always public with owner_user_id as owner", async () => {
    const user = await insertUser();
    const mission = await insertMission({ ownerUserId: user.id });

    const access = await getContentAccessContext("mission", mission.id);
    expect(access).toEqual({ visibility: "public", ownerId: user.id });
  });

  it("returns null for a nonexistent content id", async () => {
    expect(await getContentAccessContext("character", 999999)).toBeNull();
  });
});

describe("canManageContentImages", () => {
  it("allows only the owner for character/mission_log, no admin bypass", () => {
    const owner = makeViewer(1, ["player"]);
    const admin = makeViewer(2, ["admin"]);
    expect(canManageContentImages("character", 1, owner)).toBe(true);
    expect(canManageContentImages("character", 1, admin)).toBe(false);
  });

  it("allows owner or admin for mission/archive_entry", () => {
    const owner = makeViewer(1, ["player"]);
    const admin = makeViewer(2, ["admin"]);
    const stranger = makeViewer(3, ["player"]);
    expect(canManageContentImages("mission", 1, owner)).toBe(true);
    expect(canManageContentImages("mission", 1, admin)).toBe(true);
    expect(canManageContentImages("mission", 1, stranger)).toBe(false);
  });

  it("denies an anonymous viewer", () => {
    expect(canManageContentImages("mission", 1, null)).toBe(false);
  });
});
